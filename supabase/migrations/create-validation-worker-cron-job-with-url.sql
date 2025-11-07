-- ============================================================================
-- CREATE VALIDATION WORKER CRON JOB (Ready to Use)
-- ============================================================================
-- This script creates the cron job for the validation-worker function
-- with your Supabase project URL pre-configured.
--
-- IMPORTANT: Replace 'YOUR_SERVICE_ROLE_KEY' with your actual service role key
-- before running this script.
--
-- To get your service role key:
-- 1. Go to Supabase Dashboard > Project Settings > API
-- 2. Copy the "service_role" key (NOT the anon key)
-- 3. Replace YOUR_SERVICE_ROLE_KEY below
-- ============================================================================

DO $$
DECLARE
  job_id INTEGER;
  supabase_url TEXT := 'https://nneyhfhdthpxmkemyenm.supabase.co';
  service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uZXloZmhkdGhweG1rZW15ZW5tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAyOTY5OCwiZXhwIjoyMDc3NjA1Njk4fQ.PEN5cMQgEfO39L4GO4pNUw19OFTNF_8VITrjdRG_z84'; -- REPLACE THIS with your actual service role key
BEGIN
  -- Validate service role key is set
  IF service_role_key = 'YOUR_SERVICE_ROLE_KEY' THEN
    RAISE EXCEPTION 'Please replace YOUR_SERVICE_ROLE_KEY with your actual service role key from Supabase Dashboard > Project Settings > API';
  END IF;
  
  -- Check if job already exists
  BEGIN
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
          supabase_url,
          service_role_key
        ),
        'localhost',
        5432,
        current_database(),
        current_user,
        true
      )
      RETURNING jobid INTO job_id;
      
      RAISE NOTICE 'Successfully created validation-worker cron job with ID: %', job_id;
      RAISE NOTICE 'Schedule: Every 5 minutes (*/5 * * * *)';
      RAISE NOTICE 'Function URL: %/functions/v1/validation-worker', supabase_url;
    ELSE
      -- Update existing job
      UPDATE cron.job
      SET active = true,
          schedule = '*/5 * * * *',
          command = format(
            'SELECT net.http_post(
              url:=''%s/functions/v1/validation-worker'',
              headers:=''{"Authorization": "Bearer %s", "Content-Type": "application/json"}'',
              body:=''{"batchSize": 10}''::jsonb
            )',
            supabase_url,
            service_role_key
          )
      WHERE jobid = job_id;
      
      RAISE NOTICE 'Updated validation-worker cron job (ID: %)', job_id;
    END IF;
    
    -- Verify the job
    SELECT jobid INTO job_id
    FROM cron.job 
    WHERE jobname = 'validation-worker';
    
    IF job_id IS NOT NULL THEN
      RAISE NOTICE 'Cron job verified and active';
    END IF;
    
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Cannot access cron.job table.';
    RAISE NOTICE 'This requires superuser privileges.';
    RAISE NOTICE '';
    RAISE NOTICE 'To create manually via Supabase Dashboard:';
    RAISE NOTICE '1. Go to Database > Cron Jobs';
    RAISE NOTICE '2. Create new job with:';
    RAISE NOTICE '   Name: validation-worker';
    RAISE NOTICE '   Schedule: */5 * * * *';
    RAISE NOTICE '   Command: (see below)';
    RAISE NOTICE '';
    RAISE NOTICE 'Command to use:';
    RAISE NOTICE 'SELECT net.http_post(';
    RAISE NOTICE '  url:=''%s/functions/v1/validation-worker'',', supabase_url;
    RAISE NOTICE '  headers:=''{"Authorization": "Bearer %s", "Content-Type": "application/json"}'',', service_role_key;
    RAISE NOTICE '  body:=''{"batchSize": 10}''::jsonb';
    RAISE NOTICE ');';
    RAISE NOTICE '========================================';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE NOTICE 'Please check your service role key and try again.';
  END;
END $$;

-- Verify the cron job exists (if we have permission)
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN 'Active'
    ELSE 'Inactive'
  END as status
FROM cron.job
WHERE jobname = 'validation-worker';

