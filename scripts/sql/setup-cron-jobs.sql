-- Complete Cron Jobs Setup Script
-- Run this in Supabase SQL Editor to set up all cron jobs
-- 
-- Prerequisites:
-- 1. pg_cron extension enabled
-- 2. Database settings configured:
--    - app.settings.supabase_url
--    - app.settings.service_role_key
-- 3. Edge Functions deployed:
--    - process-emails
--    - refresh-tokens
--    - send-reminders

-- ============================================================================
-- STEP 1: Enable pg_cron Extension (if not already enabled)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;

-- ============================================================================
-- STEP 2: Verify Database Settings Are Configured
-- ============================================================================
-- This will show an error if settings are not configured
DO $$
BEGIN
  IF current_setting('app.settings.supabase_url', true) IS NULL THEN
    RAISE EXCEPTION 'Database setting app.settings.supabase_url is not set. Please run: ALTER DATABASE postgres SET app.settings.supabase_url = ''https://your-project.supabase.co'';';
  END IF;
  
  IF current_setting('app.settings.service_role_key', true) IS NULL THEN
    RAISE EXCEPTION 'Database setting app.settings.service_role_key is not set. Please run: ALTER DATABASE postgres SET app.settings.service_role_key = ''your-service-role-key'';';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Clean Up Existing Jobs (if any)
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
  SET status = 'expired',
      updated_at = NOW()
  WHERE status NOT IN ('completed', 'expired')
    AND due_date IS NOT NULL
    AND due_date < NOW() - INTERVAL '7 days';
  
  -- Log the cleanup activity
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
-- STEP 5: Verify Jobs Are Scheduled
-- ============================================================================
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN '✅ Active'
    ELSE '❌ Inactive'
  END as status
FROM cron.job
WHERE jobname IN ('process-emails', 'refresh-oauth-tokens', 'send-request-reminders', 'cleanup-expired-requests')
ORDER BY jobname;

-- ============================================================================
-- Success Message
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Cron jobs setup complete!';
  RAISE NOTICE 'Jobs scheduled:';
  RAISE NOTICE '  - process-emails: Every 5 minutes';
  RAISE NOTICE '  - refresh-oauth-tokens: Every hour';
  RAISE NOTICE '  - send-request-reminders: Daily at 9 AM';
  RAISE NOTICE '  - cleanup-expired-requests: Daily at midnight';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Wait a few minutes and check cron.job_run_details for executions';
  RAISE NOTICE '2. Monitor for any failures in the first 24 hours';
  RAISE NOTICE '3. Adjust schedules if needed using cron.alter_job()';
END $$;

