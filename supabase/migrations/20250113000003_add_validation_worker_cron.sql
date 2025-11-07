-- Migration: Add Cron Job for Validation Worker
-- Created: 2025-01-13
-- Description: 
--   Creates a cron job to run the validation-worker function every 5 minutes
--   All changes are idempotent and non-breaking

-- ============================================================================
-- CRON JOB: Validation Worker
-- ============================================================================
-- Schedule validation-worker to run every 5 minutes
-- This processes pending validation jobs from the queue

DO $$
DECLARE
  job_id INTEGER;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get Supabase URL and service role key from database settings
  SELECT setting INTO supabase_url FROM pg_settings WHERE name = 'app.settings.supabase_url';
  SELECT setting INTO service_role_key FROM pg_settings WHERE name = 'app.settings.service_role_key';
  
  -- If not set, use environment variables (for local dev)
  IF supabase_url IS NULL THEN
    supabase_url := current_setting('app.settings.supabase_url', true);
  END IF;
  
  IF service_role_key IS NULL THEN
    service_role_key := current_setting('app.settings.service_role_key', true);
  END IF;
  
  -- Check if job already exists
  SELECT jobid INTO job_id
  FROM cron.job
  WHERE jobname = 'validation-worker';
  
  IF job_id IS NULL THEN
    -- Create new cron job
    INSERT INTO cron.job (jobname, schedule, command, nodename, nodeport, database, username, active)
    VALUES (
      'validation-worker',
      '*/5 * * * *', -- Every 5 minutes
      format(
        'SELECT net.http_post(
          url:=''%s/functions/v1/validation-worker'',
          headers:=''{"Authorization": "Bearer %s", "Content-Type": "application/json"}'',
          body:=''{"batchSize": 10}''::jsonb
        )',
        COALESCE(supabase_url, 'https://your-project.supabase.co'),
        COALESCE(service_role_key, 'your-service-role-key')
      ),
      'localhost',
      5432,
      current_database(),
      current_user,
      true
    )
    RETURNING jobid INTO job_id;
    
    RAISE NOTICE 'Created validation-worker cron job with ID: %', job_id;
  ELSE
    -- Update existing job to ensure it's active
    UPDATE cron.job
    SET active = true,
        schedule = '*/5 * * * *'
    WHERE jobid = job_id;
    
    RAISE NOTICE 'Updated validation-worker cron job (ID: %)', job_id;
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE validation_jobs IS 
'Queue for document validation jobs. Processed by validation-worker cron job every 5 minutes.';

