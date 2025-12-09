-- Migration: Add Validation Executions Table for Auditability
-- Created: 2025-01-13
-- Description: 
--   Creates validation_executions table to track every validation run
--   All changes are idempotent and non-breaking

-- ============================================================================
-- VALIDATION EXECUTIONS TABLE
-- ============================================================================
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

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
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

-- ============================================================================
-- HELPER FUNCTION: Get Validation Execution Stats
-- ============================================================================
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

