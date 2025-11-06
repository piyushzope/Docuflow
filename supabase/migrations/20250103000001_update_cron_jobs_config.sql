-- Migration: Update Cron Jobs to Use Supabase Secrets API
-- Created: 2025-01-XX
-- Description: Updates cron jobs to use Supabase HTTP functions with proper authentication
--              Instead of database settings, uses service role key from environment

-- First, unschedule existing jobs if they exist
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
-- CRON JOB 1: Email Processing (Every 5 minutes)
-- ============================================================================
-- This job calls the Edge Function to process emails for all active accounts
-- Uses net.http_post with service role key from Supabase secrets
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

-- ============================================================================
-- CRON JOB 2: OAuth Token Refresh (Every hour)
-- ============================================================================
-- This job refreshes OAuth tokens that are expiring soon
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

-- ============================================================================
-- CRON JOB 3: Document Request Reminders (Daily at 9 AM)
-- ============================================================================
-- This job sends reminder emails for pending document requests
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

-- ============================================================================
-- CRON JOB 4: Overdue Request Cleanup (Daily at midnight)
-- ============================================================================
-- This job marks expired requests and cleans up old data
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
-- Configuration Instructions
-- ============================================================================
-- Before running this migration, set the following database settings:
--
-- Option 1: Via Supabase Dashboard (Recommended)
-- 1. Go to Project Settings > Database
-- 2. Set custom database settings:
--    - app.settings.supabase_url = 'https://your-project.supabase.co'
--    - app.settings.service_role_key = 'your-service-role-key'
--
-- Option 2: Via SQL (Less Secure - not recommended for production)
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
--
-- Note: Service role key should be stored securely. Consider using Supabase Vault
--       or environment variables instead of database settings for better security.

-- ============================================================================
-- Verify Cron Jobs
-- ============================================================================
-- After running this migration, verify jobs are scheduled:
-- SELECT jobid, jobname, schedule, active FROM cron.job 
-- WHERE jobname IN ('process-emails', 'refresh-oauth-tokens', 'send-request-reminders', 'cleanup-expired-requests')
-- ORDER BY jobname;
--
-- Check recent executions:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid IN (
--   SELECT jobid FROM cron.job 
--   WHERE jobname IN ('process-emails', 'refresh-oauth-tokens', 'send-request-reminders', 'cleanup-expired-requests')
-- )
-- ORDER BY start_time DESC
-- LIMIT 20;

