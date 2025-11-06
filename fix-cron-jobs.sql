-- Fix Script for Email Processing Cron Jobs
-- Run this in Supabase SQL Editor to set up automatic email processing
-- 
-- PREREQUISITES:
-- 1. Get your Supabase project URL from Settings > API
-- 2. Get your service_role key from Settings > API (keep this secret!)
-- 3. Replace the placeholders below with your actual values
--
-- IMPORTANT: Replace these values before running:
-- - YOUR_SUPABASE_URL (e.g., https://nneyhfhdthpxmkemyenm.supabase.co)
-- - YOUR_SERVICE_ROLE_KEY (from Settings > API > service_role key)

-- ============================================================================
-- STEP 1: Enable pg_cron Extension
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;

-- Verify extension is enabled
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'Failed to enable pg_cron extension. Check Supabase Dashboard > Database > Extensions';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Configure Database Settings
-- ============================================================================
-- IMPORTANT: Replace YOUR_SUPABASE_URL and YOUR_SERVICE_ROLE_KEY with actual values

-- Set Supabase URL
ALTER DATABASE postgres 
SET app.settings.supabase_url = 'YOUR_SUPABASE_URL';

-- Set Service Role Key (keep this secret!)
ALTER DATABASE postgres 
SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';

-- Verify settings
DO $$
DECLARE
  supabase_url_setting TEXT;
  service_key_setting TEXT;
BEGIN
  SELECT setting INTO supabase_url_setting 
  FROM pg_settings 
  WHERE name = 'app.settings.supabase_url';
  
  SELECT setting INTO service_key_setting 
  FROM pg_settings 
  WHERE name = 'app.settings.service_role_key';
  
  IF supabase_url_setting IS NULL OR supabase_url_setting = '' THEN
    RAISE EXCEPTION 'app.settings.supabase_url is not set. Please replace YOUR_SUPABASE_URL in this script.';
  END IF;
  
  IF service_key_setting IS NULL OR service_key_setting = '' THEN
    RAISE EXCEPTION 'app.settings.service_role_key is not set. Please replace YOUR_SERVICE_ROLE_KEY in this script.';
  END IF;
  
  RAISE NOTICE '✅ Database settings configured successfully';
  RAISE NOTICE 'Supabase URL: %', supabase_url_setting;
  RAISE NOTICE 'Service Role Key: ***%', RIGHT(service_key_setting, 4);
END $$;

-- ============================================================================
-- STEP 3: Unschedule Existing Jobs (Cleanup)
-- ============================================================================
SELECT cron.unschedule('process-emails') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-emails'
);

SELECT cron.unschedule('refresh-oauth-tokens') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'refresh-oauth-tokens'
);

SELECT cron.unschedule('send-request-reminders') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-request-reminders'
);

SELECT cron.unschedule('cleanup-expired-requests') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-requests'
);

-- ============================================================================
-- STEP 4: Schedule Cron Jobs
-- ============================================================================

-- Job 1: Email Processing (Every 5 minutes)
SELECT cron.schedule(
  'process-emails',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/process-emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Job 2: OAuth Token Refresh (Every hour)
SELECT cron.schedule(
  'refresh-oauth-tokens',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/refresh-tokens',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Job 3: Document Request Reminders (Daily at 9 AM)
SELECT cron.schedule(
  'send-request-reminders',
  '0 9 * * *', -- Daily at 9:00 AM
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Job 4: Overdue Request Cleanup (Daily at midnight)
SELECT cron.schedule(
  'cleanup-expired-requests',
  '0 0 * * *', -- Daily at midnight
  $$
  UPDATE document_requests
  SET status = 'expired'
  WHERE status NOT IN ('completed', 'expired')
    AND due_date IS NOT NULL
    AND due_date < NOW() - INTERVAL '7 days';
  
  -- Log the cleanup
  INSERT INTO activity_logs (organization_id, action, resource_type, details)
  SELECT 
    organization_id,
    'cleanup',
    'document_request',
    jsonb_build_object(
      'expired_count', COUNT(*),
      'cleanup_date', NOW()
    )
  FROM document_requests
  WHERE status = 'expired'
    AND updated_at::date = CURRENT_DATE
  GROUP BY organization_id;
  $$
);

-- ============================================================================
-- STEP 5: Verify Setup
-- ============================================================================
SELECT 
  '✅ Setup Complete!' AS status,
  jobname,
  schedule,
  CASE WHEN active THEN 'ACTIVE' ELSE 'INACTIVE' END AS status
FROM cron.job
WHERE jobname IN ('process-emails', 'refresh-oauth-tokens', 'send-request-reminders', 'cleanup-expired-requests')
ORDER BY jobname;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- 1. Wait 5-10 minutes for the first cron job execution
-- 2. Run diagnose-cron-jobs.sql to verify jobs are running
-- 3. Check cron.job_run_details for execution history
-- 4. Monitor Edge Function logs in Supabase Dashboard


