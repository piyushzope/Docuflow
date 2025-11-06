-- Migration: Set up Supabase Cron Jobs for Email Processing and Maintenance
-- Created: 2025-01-03
-- Description: Configures pg_cron extension and creates scheduled jobs for:
--   1. Email processing (every 5 minutes)
--   2. OAuth token refresh (every hour)
--   3. Document request reminders (daily at 9 AM)
--   4. Overdue request cleanup (daily at midnight)

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role (required for cron jobs)
GRANT USAGE ON SCHEMA cron TO postgres;

-- ============================================================================
-- CRON JOB 1: Email Processing (Every 5 minutes)
-- ============================================================================
-- This job calls the Edge Function to process emails for all active accounts
SELECT cron.schedule(
  'process-emails',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/process-emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
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
-- Calls the refresh-tokens Edge Function
SELECT cron.schedule(
  'refresh-oauth-tokens',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/refresh-tokens',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
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
-- Calls the send-reminders Edge Function
SELECT cron.schedule(
  'send-request-reminders',
  '0 9 * * *', -- Daily at 9:00 AM
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
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
-- Helper Functions (to be implemented)
-- ============================================================================

-- Function to refresh OAuth tokens (placeholder)
-- This should be implemented based on your OAuth provider requirements
CREATE OR REPLACE FUNCTION refresh_oauth_tokens_if_needed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  account_record RECORD;
BEGIN
  -- Find accounts with tokens expiring in the next hour
  FOR account_record IN
    SELECT * FROM email_accounts
    WHERE is_active = true
      AND expires_at IS NOT NULL
      AND expires_at < NOW() + INTERVAL '1 hour'
  LOOP
    -- TODO: Implement actual token refresh logic
    -- This might require calling an Edge Function or external API
    -- For now, just log that refresh is needed
    RAISE NOTICE 'Token refresh needed for account: %', account_record.email;
    
    -- You could call an Edge Function here:
    -- PERFORM net.http_post(
    --   url := current_setting('app.settings.supabase_url') || '/functions/v1/refresh-tokens',
    --   headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    --   body := jsonb_build_object('account_id', account_record.id)
    -- );
  END LOOP;
END;
$$;

-- Function to send document request reminders (placeholder)
CREATE OR REPLACE FUNCTION send_document_request_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_record RECORD;
BEGIN
  -- Find requests that are due in 1-3 days and haven't been reminded recently
  FOR request_record IN
    SELECT dr.*, o.id as organization_id
    FROM document_requests dr
    JOIN organizations o ON dr.organization_id = o.id
    WHERE dr.status IN ('pending', 'sent', 'missing_files')
      AND dr.due_date IS NOT NULL
      AND dr.due_date BETWEEN NOW() + INTERVAL '1 day' AND NOW() + INTERVAL '3 days'
      AND (dr.last_reminder_sent IS NULL OR dr.last_reminder_sent < NOW() - INTERVAL '24 hours')
  LOOP
    -- TODO: Implement actual reminder sending logic
    -- This should call an Edge Function or use your email sending service
    RAISE NOTICE 'Reminder needed for request: % (due: %)', request_record.id, request_record.due_date;
    
    -- Update last_reminder_sent timestamp
    UPDATE document_requests
    SET last_reminder_sent = NOW()
    WHERE id = request_record.id;
    
    -- You could call an Edge Function here:
    -- PERFORM net.http_post(
    --   url := current_setting('app.settings.supabase_url') || '/functions/v1/send-reminder',
    --   headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    --   body := jsonb_build_object('request_id', request_record.id)
    -- );
  END LOOP;
END;
$$;

-- ============================================================================
-- View: Monitor Cron Job Execution
-- ============================================================================
-- Query to check cron job execution history
CREATE OR REPLACE VIEW cron_job_status AS
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  jobid as job_id
FROM cron.job
WHERE jobname IN ('process-emails', 'refresh-oauth-tokens', 'send-request-reminders', 'cleanup-expired-requests')
ORDER BY jobname;

-- ============================================================================
-- Query Cron Job History
-- ============================================================================
-- Example queries to monitor cron jobs:
--
-- View all cron jobs:
-- SELECT * FROM cron.job ORDER BY jobname;
--
-- View execution history for email processing:
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-emails')
-- ORDER BY start_time DESC
-- LIMIT 10;
--
-- View failed jobs:
-- SELECT * FROM cron.job_run_details
-- WHERE status = 'failed'
-- ORDER BY start_time DESC;

-- ============================================================================
-- Configuration Notes
-- ============================================================================
-- Before running this migration, you need to:
-- 1. Enable pg_cron in your Supabase project settings
-- 2. Set the following database settings (via Supabase Dashboard or SQL):
--    - app.settings.supabase_url = 'https://your-project.supabase.co'
--    - app.settings.service_role_key = 'your-service-role-key' (keep secure!)
--
-- To set these settings:
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
--
-- WARNING: Never expose service_role_key in client-side code!
-- These settings should only be set server-side.

-- ============================================================================
-- Unschedule Jobs (if needed)
-- ============================================================================
-- To remove a cron job:
-- SELECT cron.unschedule('process-emails');
-- SELECT cron.unschedule('refresh-oauth-tokens');
-- SELECT cron.unschedule('send-request-reminders');
-- SELECT cron.unschedule('cleanup-expired-requests');

