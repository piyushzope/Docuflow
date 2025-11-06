-- Fix Automatic Email Processing
-- Generated: 2025-11-04T15:35:27.226Z
-- 
-- This script fixes automatic email processing by:
-- 1. Enabling pg_cron extension
-- 2. Configuring database settings (Supabase URL and service role key)
-- 3. Scheduling the process-emails cron job to run every 5 minutes
-- 4. Verifying the setup
--
-- PREREQUISITES:
-- - Supabase project with pg_cron extension available
-- - process-emails Edge Function deployed
-- - Service role key with proper permissions
--
-- SECURITY NOTE: This file contains your service role key.
-- Delete it after use: rm fix-automatic-email-processing.sql

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
  RAISE NOTICE '✅ pg_cron extension enabled';
END $$;

-- ============================================================================
-- STEP 2: Configure Database Settings
-- ============================================================================
-- Set Supabase URL
ALTER DATABASE postgres 
SET app.settings.supabase_url = 'https://nneyhfhdthpxmkemyenm.supabase.co';

-- Set Service Role Key (keep this secret!)
ALTER DATABASE postgres 
SET app.settings.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uZXloZmhkdGhweG1rZW15ZW5tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAyOTY5OCwiZXhwIjoyMDc3NjA1Njk4fQ.PEN5cMQgEfO39L4GO4pNUw19OFTNF_8VITrjdRG_z84';

-- Verify settings are configured
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
    RAISE EXCEPTION 'app.settings.supabase_url is not set correctly';
  END IF;
  
  IF service_key_setting IS NULL OR service_key_setting = '' THEN
    RAISE EXCEPTION 'app.settings.service_role_key is not set correctly';
  END IF;
  
  RAISE NOTICE '✅ Database settings configured successfully';
  RAISE NOTICE 'Supabase URL: %', supabase_url_setting;
  RAISE NOTICE 'Service Role Key: ***%', RIGHT(service_key_setting, 4);
END $$;

-- ============================================================================
-- STEP 3: Unschedule Existing Job (Cleanup)
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
-- STEP 4: Schedule Email Processing Cron Job
-- ============================================================================
-- Schedule email processing to run every 5 minutes
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
-- STEP 5: Verification Queries
-- ============================================================================
-- Check 1: pg_cron Extension Status
SELECT 
  'VERIFICATION 1: pg_cron Extension' AS check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ ENABLED'
    ELSE '❌ NOT ENABLED'
  END AS status,
  COALESCE(MAX(extversion), 'N/A') AS version
FROM pg_extension 
WHERE extname = 'pg_cron';

-- Check 2: Database Settings
SELECT 
  'VERIFICATION 2: Database Settings' AS check_name,
  name AS setting_name,
  CASE 
    WHEN setting IS NOT NULL AND setting != '' THEN '✅ CONFIGURED'
    ELSE '❌ NOT CONFIGURED'
  END AS status,
  CASE 
    WHEN name = 'app.settings.service_role_key' AND setting IS NOT NULL THEN 
      '***' || RIGHT(setting, 4) -- Show last 4 chars only for security
    ELSE setting
  END AS setting_value
FROM pg_settings 
WHERE name LIKE 'app.settings.%'
ORDER BY name;

-- Check 3: Cron Job Status
SELECT 
  'VERIFICATION 3: Cron Job Status' AS check_name,
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
  'VERIFICATION 4: Active Email Accounts' AS check_name,
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
    WHEN NOT EXISTS (SELECT 1 FROM pg_settings WHERE name = 'app.settings.supabase_url' AND setting IS NOT NULL AND setting != '') THEN 
      '❌ CRITICAL: Database setting app.settings.supabase_url not configured'
    WHEN NOT EXISTS (SELECT 1 FROM pg_settings WHERE name = 'app.settings.service_role_key' AND setting IS NOT NULL AND setting != '') THEN 
      '❌ CRITICAL: Database setting app.settings.service_role_key not configured'
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
-- 5. Delete this file after use (contains sensitive service role key)

