-- ============================================================================
-- CREATE VALIDATION WORKER CRON JOB (Manual - Requires Elevated Privileges)
-- ============================================================================
-- This script creates the cron job for the validation-worker function.
-- Run this separately with superuser privileges if the main migration
-- cannot create the cron job due to permission restrictions.
--
-- Usage:
--   1. Via Supabase Dashboard: SQL Editor (with service role key)
--   2. Via Supabase CLI: supabase db execute --file create-validation-worker-cron-job.sql
--   3. Directly via psql with superuser access
-- ============================================================================

DO $$
DECLARE
  job_id INTEGER;
  supabase_url TEXT;
  service_role_key TEXT;
  has_permission BOOLEAN := false;
BEGIN
  -- First, check if we have permission to access cron.job
  BEGIN
    SELECT jobid INTO job_id
    FROM cron.job
    WHERE jobname = 'validation-worker'
    LIMIT 1;
    has_permission := true;
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Cannot access cron.job table.';
    RAISE NOTICE 'This requires superuser privileges.';
    RAISE NOTICE '';
    RAISE NOTICE 'To create the cron job manually:';
    RAISE NOTICE '1. Go to Supabase Dashboard > Database > Cron Jobs';
    RAISE NOTICE '2. Or contact your database administrator';
    RAISE NOTICE '3. Or use Supabase CLI with service role key';
    RAISE NOTICE '';
    RAISE NOTICE 'The cron job should call:';
    RAISE NOTICE '  POST https://your-project.supabase.co/functions/v1/validation-worker';
    RAISE NOTICE '  Schedule: */5 * * * * (every 5 minutes)';
    RAISE NOTICE '  Headers: Authorization: Bearer <service-role-key>';
    RAISE NOTICE '  Body: {"batchSize": 10}';
    RAISE NOTICE '========================================';
    RETURN;
  END;
  
  -- If we have permission, proceed
  IF has_permission THEN
    -- Get Supabase URL and service role key from database settings
    SELECT setting INTO supabase_url FROM pg_settings WHERE name = 'app.settings.supabase_url';
    SELECT setting INTO service_role_key FROM pg_settings WHERE name = 'app.settings.service_role_key';
    
    -- If not set, try to get from current_setting
    IF supabase_url IS NULL OR supabase_url = '' THEN
      BEGIN
        supabase_url := current_setting('app.settings.supabase_url', true);
      EXCEPTION WHEN OTHERS THEN
        supabase_url := NULL;
      END;
    END IF;
    
    IF service_role_key IS NULL OR service_role_key = '' THEN
      BEGIN
        service_role_key := current_setting('app.settings.service_role_key', true);
      EXCEPTION WHEN OTHERS THEN
        service_role_key := NULL;
      END;
    END IF;
    
    -- Check if job already exists
    SELECT jobid INTO job_id
    FROM cron.job
    WHERE jobname = 'validation-worker';
    
    IF job_id IS NULL THEN
      -- If settings are not available, use placeholders that can be updated later
      IF supabase_url IS NULL OR supabase_url = '' THEN
        supabase_url := 'https://your-project.supabase.co';
        RAISE NOTICE 'WARNING: app.settings.supabase_url not set. Using placeholder.';
        RAISE NOTICE 'Update the cron job command after creation with your actual URL.';
      END IF;
      
      IF service_role_key IS NULL OR service_role_key = '' THEN
        service_role_key := 'your-service-role-key';
        RAISE NOTICE 'WARNING: app.settings.service_role_key not set. Using placeholder.';
        RAISE NOTICE 'Update the cron job command after creation with your actual key.';
      END IF;
      
      -- Create new cron job
      BEGIN
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
      EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
        RAISE NOTICE 'Failed to create cron job: %', SQLERRM;
        RAISE NOTICE 'Please create manually via Supabase Dashboard > Database > Cron Jobs';
      END;
    ELSE
      -- Update existing job to ensure it's active and has correct schedule
      BEGIN
        UPDATE cron.job
        SET active = true,
            schedule = '*/5 * * * *',
            command = format(
              'SELECT net.http_post(
                url:=''%s/functions/v1/validation-worker'',
                headers:=''{"Authorization": "Bearer %s", "Content-Type": "application/json"}'',
                body:=''{"batchSize": 10}''::jsonb
              )',
              COALESCE(supabase_url, 'https://your-project.supabase.co'),
              COALESCE(service_role_key, 'your-service-role-key')
            )
        WHERE jobid = job_id;
        
        RAISE NOTICE 'Updated validation-worker cron job (ID: %)', job_id;
      EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
        RAISE NOTICE 'Failed to update cron job: %', SQLERRM;
      END;
    END IF;
    
    -- Verify the job was created/updated
    BEGIN
      SELECT jobid INTO job_id
      FROM cron.job 
      WHERE jobname = 'validation-worker';
      
      IF job_id IS NOT NULL THEN
        RAISE NOTICE 'Cron job verified and active';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Ignore verification errors
      NULL;
    END;
  END IF;
END $$;

-- Verify the cron job exists
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

