-- Migration: Add cron job for document renewal reminders
-- This migration adds a scheduled job to send renewal reminders for expiring documents

-- Unschedule existing job if it exists
SELECT cron.unschedule('send-renewal-reminders') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-renewal-reminders'
);

-- ============================================================================
-- CRON JOB: Document Renewal Reminders (Daily at 9 AM)
-- ============================================================================
-- This job sends reminder emails for documents expiring soon (90, 60, 30 days)
-- or that have expired. Calls the send-renewal-reminders Edge Function
SELECT cron.schedule(
  'send-renewal-reminders',
  '0 9 * * *', -- Daily at 9:00 AM
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-renewal-reminders',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- ============================================================================
-- Verify Cron Job
-- ============================================================================
-- After running this migration, verify the job is scheduled:
-- SELECT jobid, jobname, schedule, active FROM cron.job 
-- WHERE jobname = 'send-renewal-reminders';
--
-- Check recent executions:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-renewal-reminders')
-- ORDER BY start_time DESC
-- LIMIT 10;

