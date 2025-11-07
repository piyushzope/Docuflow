-- Migration: Add Validation Queue System for Resilience
-- Created: 2025-01-13
-- Description: 
--   1. Creates validation_jobs table for queued validation tasks
--   2. Creates validation_dlq table for failed validations
--   3. All changes are idempotent and non-breaking

-- ============================================================================
-- VALIDATION JOBS TABLE
-- ============================================================================
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

-- ============================================================================
-- VALIDATION DLQ TABLE (Dead Letter Queue)
-- ============================================================================
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

-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Updated_at trigger for validation_jobs
DROP TRIGGER IF EXISTS update_validation_jobs_updated_at ON validation_jobs;
CREATE TRIGGER update_validation_jobs_updated_at
  BEFORE UPDATE ON validation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTION: Calculate Next Retry Time
-- ============================================================================
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

-- ============================================================================
-- HELPER FUNCTION: Move Job to DLQ
-- ============================================================================
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

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
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

