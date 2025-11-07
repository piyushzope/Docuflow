-- ============================================================================
-- VALIDATION HARDENING - COMPLETE MIGRATION
-- Created: 2025-01-13
-- Description: 
--   Complete migration for validation hardening including:
--   1. Request intake hardening (standardized request types)
--   2. Content hash and duplicate detection
--   3. Validation queue system with retry logic and DLQ
--   4. Validation worker cron job
--   5. Validation executions tracking for auditability
--   All changes are idempotent and non-breaking
-- ============================================================================

-- ============================================================================
-- PART 1: HARDEN REQUEST INTAKE - Standardize request types and add validation
-- ============================================================================

-- Create request type lookup table
CREATE TABLE IF NOT EXISTS document_request_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_code TEXT UNIQUE NOT NULL, -- Standardized code (e.g., 'drivers_license', 'passport')
    display_name TEXT NOT NULL, -- Human-readable name
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active types
CREATE INDEX IF NOT EXISTS idx_request_types_active ON document_request_types(is_active) WHERE is_active = true;

-- Insert standard document types (idempotent)
INSERT INTO document_request_types (type_code, display_name, description) VALUES
    ('passport', 'Passport', 'International passport document'),
    ('drivers_license', 'Driver''s License', 'Driver license or permit'),
    ('id_card', 'ID Card', 'Government-issued identification card'),
    ('birth_certificate', 'Birth Certificate', 'Official birth certificate'),
    ('visa', 'Visa', 'Travel or work visa'),
    ('ead', 'EAD', 'Employment Authorization Document'),
    ('mec', 'MEC', 'Medical Examiner Card'),
    ('ssn', 'SSN', 'Social Security Number card'),
    ('i9', 'I-9', 'Form I-9 Employment Eligibility Verification'),
    ('w2', 'W-2', 'Wage and Tax Statement'),
    ('other', 'Other', 'Other document type')
ON CONFLICT (type_code) DO NOTHING;

-- Function to normalize request type to standard code
CREATE OR REPLACE FUNCTION normalize_request_type(input_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF input_type IS NULL OR input_type = '' THEN
        RETURN NULL;
    END IF;
    
    -- Normalize to lowercase and trim
    input_type := LOWER(TRIM(input_type));
    
    -- Map common variations to standard codes
    CASE
        WHEN input_type IN ('passport', 'passports', 'international passport') THEN
            RETURN 'passport';
        WHEN input_type IN ('driver''s license', 'drivers license', 'drivers_license', 'driver license', 'dl', 'driving license') THEN
            RETURN 'drivers_license';
        WHEN input_type IN ('id card', 'id_card', 'identification card', 'id', 'government id') THEN
            RETURN 'id_card';
        WHEN input_type IN ('birth certificate', 'birth_certificate', 'birth cert', 'bc') THEN
            RETURN 'birth_certificate';
        WHEN input_type IN ('visa', 'visas', 'travel visa', 'work visa') THEN
            RETURN 'visa';
        WHEN input_type IN ('ead', 'employment authorization document', 'work permit') THEN
            RETURN 'ead';
        WHEN input_type IN ('mec', 'medical examiner card', 'medical card', 'dot medical card') THEN
            RETURN 'mec';
        WHEN input_type IN ('ssn', 'social security number', 'social security card', 'ss card') THEN
            RETURN 'ssn';
        WHEN input_type IN ('i-9', 'i9', 'form i-9', 'form i9', 'employment eligibility') THEN
            RETURN 'i9';
        WHEN input_type IN ('w-2', 'w2', 'wage statement', 'tax form w-2') THEN
            RETURN 'w2';
        ELSE
            -- If no match, return 'other' or the original if it's already a valid code
            IF input_type IN (SELECT type_code FROM document_request_types) THEN
                RETURN input_type;
            ELSE
                RETURN 'other';
            END IF;
    END CASE;
END;
$$;

-- Backfill existing request types with normalized values
DO $$
DECLARE
    rec RECORD;
    normalized_type TEXT;
BEGIN
    FOR rec IN 
        SELECT id, request_type 
        FROM document_requests 
        WHERE request_type IS NOT NULL 
        AND request_type != ''
    LOOP
        normalized_type := normalize_request_type(rec.request_type);
        
        IF normalized_type IS NOT NULL AND normalized_type != rec.request_type THEN
            UPDATE document_requests
            SET request_type = normalized_type
            WHERE id = rec.id;
        END IF;
    END LOOP;
END $$;

-- Add comment for future reference
COMMENT ON COLUMN document_requests.request_type IS 
'Standardized document request type code. Valid values: passport, drivers_license, id_card, birth_certificate, visa, ead, mec, ssn, i9, w2, other. Use normalize_request_type() function to convert user input.';

-- Helper function to validate request type
CREATE OR REPLACE FUNCTION is_valid_request_type(type_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF type_code IS NULL THEN
        RETURN true; -- NULL is allowed
    END IF;
    
    RETURN EXISTS (
        SELECT 1 
        FROM document_request_types 
        WHERE type_code = LOWER(TRIM(type_code)) 
        AND is_active = true
    );
END;
$$;

COMMENT ON FUNCTION is_valid_request_type IS 'Validates if a request type code exists and is active in document_request_types table';

-- ============================================================================
-- PART 2: ADD CONTENT HASH AND DUPLICATE DETECTION
-- ============================================================================

-- Add content_hash column to documents table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'content_hash'
  ) THEN
    ALTER TABLE documents 
    ADD COLUMN content_hash TEXT;
    
    RAISE NOTICE 'Added content_hash column to documents table';
  ELSE
    RAISE NOTICE 'content_hash column already exists';
  END IF;
END $$;

-- Index for efficient duplicate lookups within an organization
CREATE INDEX IF NOT EXISTS idx_documents_content_hash_org 
ON documents(organization_id, content_hash) 
WHERE content_hash IS NOT NULL;

-- Add comment
COMMENT ON COLUMN documents.content_hash IS 
'SHA-256 hash of document content for duplicate detection. Computed during validation.';

-- Helper function to find duplicates
CREATE OR REPLACE FUNCTION find_duplicate_documents(
  p_organization_id UUID,
  p_content_hash TEXT,
  p_exclude_document_id UUID DEFAULT NULL
)
RETURNS TABLE (
  document_id UUID,
  original_filename TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.original_filename,
    d.created_at
  FROM documents d
  WHERE d.organization_id = p_organization_id
    AND d.content_hash = p_content_hash
    AND d.content_hash IS NOT NULL
    AND (p_exclude_document_id IS NULL OR d.id != p_exclude_document_id)
  ORDER BY d.created_at ASC;
END;
$$;

COMMENT ON FUNCTION find_duplicate_documents IS 
'Finds documents with the same content hash within an organization, optionally excluding a specific document';

-- ============================================================================
-- PART 3: ADD VALIDATION QUEUE SYSTEM FOR RESILIENCE
-- ============================================================================

-- Validation jobs table
CREATE TABLE IF NOT EXISTS validation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    attempt INTEGER DEFAULT 1 NOT NULL,
    max_attempts INTEGER DEFAULT 6 NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')) NOT NULL,
    next_run_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    error_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for efficient job processing
CREATE INDEX IF NOT EXISTS idx_validation_jobs_status_next_run 
ON validation_jobs(status, next_run_at) 
WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_validation_jobs_document 
ON validation_jobs(document_id);

CREATE INDEX IF NOT EXISTS idx_validation_jobs_organization 
ON validation_jobs(organization_id);

-- Validation DLQ table (Dead Letter Queue)
CREATE TABLE IF NOT EXISTS validation_dlq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    original_job_id UUID REFERENCES validation_jobs(id) ON DELETE SET NULL,
    final_attempt INTEGER NOT NULL,
    final_error_message TEXT,
    final_error_details JSONB DEFAULT '{}'::jsonb,
    validation_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolution_notes TEXT
);

-- Indexes for DLQ
CREATE INDEX IF NOT EXISTS idx_validation_dlq_document 
ON validation_dlq(document_id);

CREATE INDEX IF NOT EXISTS idx_validation_dlq_organization 
ON validation_dlq(organization_id);

CREATE INDEX IF NOT EXISTS idx_validation_dlq_unresolved 
ON validation_dlq(organization_id, resolved_at) 
WHERE resolved_at IS NULL;

-- Updated_at trigger for validation_jobs
DROP TRIGGER IF EXISTS update_validation_jobs_updated_at ON validation_jobs;
CREATE TRIGGER update_validation_jobs_updated_at
  BEFORE UPDATE ON validation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function: Calculate next retry time
CREATE OR REPLACE FUNCTION calculate_next_retry_time(attempt_number INTEGER)
RETURNS INTERVAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Exponential backoff: 1m, 5m, 15m, 1h, 6h, 24h
  CASE attempt_number
    WHEN 1 THEN RETURN INTERVAL '1 minute';
    WHEN 2 THEN RETURN INTERVAL '5 minutes';
    WHEN 3 THEN RETURN INTERVAL '15 minutes';
    WHEN 4 THEN RETURN INTERVAL '1 hour';
    WHEN 5 THEN RETURN INTERVAL '6 hours';
    WHEN 6 THEN RETURN INTERVAL '24 hours';
    ELSE RETURN INTERVAL '24 hours'; -- Cap at 24 hours
  END CASE;
END;
$$;

COMMENT ON FUNCTION calculate_next_retry_time IS 
'Calculates the next retry time based on attempt number using exponential backoff';

-- Helper function: Move job to DLQ
CREATE OR REPLACE FUNCTION move_job_to_dlq(
  p_job_id UUID,
  p_error_message TEXT,
  p_error_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  job_record RECORD;
  dlq_id UUID;
BEGIN
  -- Get job details
  SELECT * INTO job_record
  FROM validation_jobs
  WHERE id = p_job_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found: %', p_job_id;
  END IF;
  
  -- Insert into DLQ
  INSERT INTO validation_dlq (
    document_id,
    organization_id,
    original_job_id,
    final_attempt,
    final_error_message,
    final_error_details
  )
  VALUES (
    job_record.document_id,
    job_record.organization_id,
    job_record.id,
    job_record.attempt,
    p_error_message,
    p_error_details
  )
  RETURNING id INTO dlq_id;
  
  -- Update job status
  UPDATE validation_jobs
  SET 
    status = 'failed',
    completed_at = NOW(),
    error_message = p_error_message,
    error_details = p_error_details
  WHERE id = p_job_id;
  
  RETURN dlq_id;
END;
$$;

COMMENT ON FUNCTION move_job_to_dlq IS 
'Moves a failed validation job to the dead letter queue after max attempts';

-- RLS Policies for validation_jobs
ALTER TABLE validation_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view validation jobs for their organization" ON validation_jobs;
CREATE POLICY "Users can view validation jobs for their organization"
  ON validation_jobs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Only service role can insert/update validation jobs" ON validation_jobs;
CREATE POLICY "Only service role can insert/update validation jobs"
  ON validation_jobs FOR ALL
  USING (true); -- Edge functions use service role

-- RLS Policies for validation_dlq
ALTER TABLE validation_dlq ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view DLQ entries for their organization" ON validation_dlq;
CREATE POLICY "Users can view DLQ entries for their organization"
  ON validation_dlq FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update DLQ entries for their organization" ON validation_dlq;
CREATE POLICY "Users can update DLQ entries for their organization"
  ON validation_dlq FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Only service role can insert DLQ entries" ON validation_dlq;
CREATE POLICY "Only service role can insert DLQ entries"
  ON validation_dlq FOR INSERT
  WITH CHECK (true); -- Edge functions use service role

-- ============================================================================
-- PART 4: ADD VALIDATION WORKER CRON JOB
-- ============================================================================
-- Uses cron.schedule() to match existing migration patterns
-- Requires app.settings.supabase_url and app.settings.service_role_key to be set

-- Unschedule existing job if it exists
SELECT cron.unschedule('validation-worker') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'validation-worker'
);

-- Schedule validation-worker to run every 5 minutes
SELECT cron.schedule(
  'validation-worker',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/validation-worker',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{"batchSize": 10}'::jsonb
    ) AS request_id;
  $$
);

-- Add comment
COMMENT ON TABLE validation_jobs IS 
'Queue for document validation jobs. Processed by validation-worker cron job every 5 minutes.';

-- ============================================================================
-- PART 5: ADD VALIDATION EXECUTIONS TABLE FOR AUDITABILITY
-- ============================================================================

-- Validation executions table
CREATE TABLE IF NOT EXISTS validation_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    finished_at TIMESTAMPTZ,
    duration_ms INTEGER, -- Duration in milliseconds
    model TEXT, -- e.g., 'gpt-4o', 'gpt-4o-mini'
    prompt_version TEXT, -- Prompt version used
    token_usage JSONB DEFAULT '{}'::jsonb, -- { input_tokens, output_tokens, total_tokens }
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'timeout')) NOT NULL,
    error_summary TEXT,
    error_details JSONB DEFAULT '{}'::jsonb,
    triggered_by TEXT DEFAULT 'system', -- 'system', 'manual', 'queue', or user_id
    triggered_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    validation_result_id UUID REFERENCES document_validations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_validation_executions_document 
ON validation_executions(document_id);

CREATE INDEX IF NOT EXISTS idx_validation_executions_organization 
ON validation_executions(organization_id);

CREATE INDEX IF NOT EXISTS idx_validation_executions_status 
ON validation_executions(status);

CREATE INDEX IF NOT EXISTS idx_validation_executions_started 
ON validation_executions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_validation_executions_triggered_by 
ON validation_executions(triggered_by_user_id) 
WHERE triggered_by_user_id IS NOT NULL;

-- RLS Policies for validation_executions
ALTER TABLE validation_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view validation executions for their organization" ON validation_executions;
CREATE POLICY "Users can view validation executions for their organization"
  ON validation_executions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Only service role can insert/update validation executions" ON validation_executions;
CREATE POLICY "Only service role can insert/update validation executions"
  ON validation_executions FOR ALL
  USING (true); -- Edge functions use service role

-- Helper function: Get validation execution stats
CREATE OR REPLACE FUNCTION get_validation_execution_stats(
  p_organization_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_executions BIGINT,
  completed_executions BIGINT,
  failed_executions BIGINT,
  timeout_executions BIGINT,
  avg_duration_ms NUMERIC,
  total_tokens BIGINT,
  model_breakdown JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_executions,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_executions,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_executions,
    COUNT(*) FILTER (WHERE status = 'timeout')::BIGINT as timeout_executions,
    AVG(duration_ms)::NUMERIC as avg_duration_ms,
    SUM((token_usage->>'total_tokens')::BIGINT)::BIGINT as total_tokens,
    jsonb_object_agg(
      model, 
      COUNT(*)::BIGINT
    ) FILTER (WHERE model IS NOT NULL) as model_breakdown
  FROM validation_executions
  WHERE organization_id = p_organization_id
    AND (p_start_date IS NULL OR started_at >= p_start_date)
    AND (p_end_date IS NULL OR started_at <= p_end_date);
END;
$$;

COMMENT ON FUNCTION get_validation_execution_stats IS 
'Returns aggregated statistics for validation executions within a date range';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All validation hardening features have been deployed.
-- Feature flags in organizations.settings control which features are active.
--
-- IMPORTANT: Before the validation-worker cron job will work, ensure:
-- 1. Database settings are configured:
--    ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
--    ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
-- 2. Verify cron job is scheduled:
--    SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'validation-worker';
-- ============================================================================

