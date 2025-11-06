-- Fix Automatic Email Processing (Direct Values)
-- This version embeds the Supabase URL and service role key directly in the cron job
-- No database settings required - works without superuser privileges
-- Generated: 2025-11-04
-- 
-- This script fixes automatic email processing by:
-- 1. Enabling pg_cron extension
-- 2. Scheduling the process-emails cron job with embedded credentials
-- 3. Verifying the setup

-- ============================================================================
-- STEP 1: Enable Required Extensions
-- ============================================================================
-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;

-- Enable pg_net for HTTP requests (required for calling Edge Functions)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Verify extensions are enabled
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'Failed to enable pg_cron extension. Check Supabase Dashboard > Database > Extensions';
  END IF;
  RAISE NOTICE '✅ pg_cron extension enabled';
  
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE EXCEPTION 'Failed to enable pg_net extension. Check Supabase Dashboard > Database > Extensions';
  END IF;
  RAISE NOTICE '✅ pg_net extension enabled';
END $$;

-- ============================================================================
-- STEP 2: Unschedule Existing Job (Cleanup)
-- ============================================================================
-- Remove existing process-emails job if it exists to avoid duplicates
SELECT cron.unschedule('process-emails') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-emails'
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-emails') THEN
    RAISE NOTICE '⚠️  Existing process-emails job found and unscheduled';
  ELSE
    RAISE NOTICE '✅ No existing process-emails job found';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Schedule Email Processing Cron Job (with embedded values)
-- ============================================================================
-- Schedule email processing to run every 5 minutes
-- NOTE: Values are embedded directly - no database settings needed
SELECT cron.schedule(
  'process-emails',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://nneyhfhdthpxmkemyenm.supabase.co/functions/v1/process-emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uZXloZmhkdGhweG1rZW15ZW5tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAyOTY5OCwiZXhwIjoyMDc3NjA1Njk4fQ.PEN5cMQgEfO39L4GO4pNUw19OFTNF_8VITrjdRG_z84',
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Verify job was scheduled
DO $$
DECLARE
  job_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO job_count
  FROM cron.job
  WHERE jobname = 'process-emails' AND active = true;
  
  IF job_count > 0 THEN
    RAISE NOTICE '✅ process-emails cron job scheduled successfully';
    RAISE NOTICE '   Schedule: Every 5 minutes (*/5 * * * *)';
    RAISE NOTICE '   Status: ACTIVE';
  ELSE
    RAISE EXCEPTION 'Failed to schedule process-emails cron job';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Verification Queries
-- ============================================================================
-- Check 1: Required Extensions Status
SELECT 
  'VERIFICATION 1: Required Extensions' AS check_name,
  extname AS extension_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ ENABLED'
    ELSE '❌ NOT ENABLED'
  END AS status,
  COALESCE(MAX(extversion), 'N/A') AS version
FROM pg_extension 
WHERE extname IN ('pg_cron', 'pg_net')
GROUP BY extname
ORDER BY extname;

-- Check 2: Cron Job Status
SELECT 
  'VERIFICATION 2: Cron Job Status' AS check_name,
  jobid,
  jobname,
  schedule,
  CASE 
    WHEN active THEN '✅ ACTIVE'
    ELSE '❌ INACTIVE'
  END AS status,
  CASE 
    WHEN jobname = 'process-emails' AND active = true THEN 
      '✅ Email processing will run every 5 minutes'
    WHEN jobname = 'process-emails' AND active = false THEN 
      '❌ Job exists but is inactive'
    ELSE ''
  END AS notes
FROM cron.job
WHERE jobname = 'process-emails';

-- Check 4: Active Email Accounts
SELECT 
  'VERIFICATION 3: Active Email Accounts' AS check_name,
  COUNT(*) AS active_accounts,
  CASE 
    WHEN COUNT(*) = 0 THEN '⚠️  NO ACTIVE ACCOUNTS - No emails will be processed'
    ELSE '✅ ' || COUNT(*) || ' active account(s) ready for processing'
  END AS status
FROM email_accounts
WHERE is_active = true;

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT 
  'SUMMARY' AS check_name,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN 
      '❌ CRITICAL: pg_cron extension not enabled'
    WHEN NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN 
      '❌ CRITICAL: pg_net extension not enabled (required for HTTP calls)'
    WHEN NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-emails' AND active = true) THEN 
      '❌ CRITICAL: process-emails cron job not scheduled or inactive'
    ELSE 
      '✅ All checks passed - Email processing should be working automatically!'
  END AS overall_status;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- 1. Wait 5-10 minutes for the first cron job execution
-- 2. Check execution history:
--    SELECT * FROM cron.job_run_details 
--    WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-emails')
--    ORDER BY start_time DESC LIMIT 10;
-- 3. Check Edge Function logs in Supabase Dashboard > Edge Functions > process-emails > Logs
-- 4. Run diagnose-cron-jobs.sql for detailed diagnostics

-- SECURITY NOTE: This file contains your service role key embedded in the cron job.
-- The key is stored in the cron job definition (server-side only, safe).
-- Delete this file after use.

