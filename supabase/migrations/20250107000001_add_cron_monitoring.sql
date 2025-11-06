-- Migration: Add Cron Job Monitoring
-- Created: 2025-01-07
-- Description: Creates a table to track cron job execution history

-- Create cron_job_executions table
CREATE TABLE IF NOT EXISTS cron_job_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'running')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_cron_job_executions_job_name ON cron_job_executions(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_job_executions_status ON cron_job_executions(status);
CREATE INDEX IF NOT EXISTS idx_cron_job_executions_started_at ON cron_job_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_job_executions_job_status ON cron_job_executions(job_name, status, started_at DESC);

-- Add comment for documentation
COMMENT ON TABLE cron_job_executions IS 'Tracks execution history of cron jobs for monitoring and debugging';
COMMENT ON COLUMN cron_job_executions.job_name IS 'Name of the cron job (e.g., process-emails, refresh-tokens)';
COMMENT ON COLUMN cron_job_executions.status IS 'Execution status: success, failed, or running';
COMMENT ON COLUMN cron_job_executions.duration_ms IS 'Execution duration in milliseconds';
COMMENT ON COLUMN cron_job_executions.error_message IS 'Error message if execution failed';
COMMENT ON COLUMN cron_job_executions.metadata IS 'Additional metadata about the execution';

-- Create function to log cron job execution
CREATE OR REPLACE FUNCTION log_cron_job_execution(
  p_job_name TEXT,
  p_status TEXT,
  p_duration_ms INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_execution_id UUID;
BEGIN
  INSERT INTO cron_job_executions (
    job_name,
    status,
    completed_at,
    duration_ms,
    error_message,
    metadata
  ) VALUES (
    p_job_name,
    p_status,
    NOW(),
    p_duration_ms,
    p_error_message,
    p_metadata
  ) RETURNING id INTO v_execution_id;
  
  RETURN v_execution_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for recent cron job execution status
-- Note: Using a different name to avoid conflict with existing cron_job_status view
CREATE OR REPLACE VIEW cron_job_execution_status AS
SELECT 
  job_name,
  COUNT(*) FILTER (WHERE status = 'success') AS success_count,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
  COUNT(*) FILTER (WHERE status = 'running') AS running_count,
  MAX(started_at) AS last_execution,
  AVG(duration_ms) FILTER (WHERE status = 'success') AS avg_duration_ms,
  MAX(CASE WHEN status = 'failed' THEN error_message END) AS last_error
FROM cron_job_executions
WHERE started_at >= NOW() - INTERVAL '7 days'
GROUP BY job_name;

COMMENT ON VIEW cron_job_execution_status IS 'Summary view of cron job execution status over the last 7 days';

