-- Diagnostic Script for Email Processing Cron Jobs
-- Run this in Supabase SQL Editor to diagnose why email processing isn't automatic
-- 
-- This script checks:
-- 1. pg_cron extension status
-- 2. Database settings configuration
-- 3. Cron job scheduling status
-- 4. Recent execution history
-- 5. Edge Function availability

-- ============================================================================
-- STEP 1: Check pg_cron Extension
-- ============================================================================
SELECT 
  'STEP 1: pg_cron Extension' AS check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ ENABLED'
    ELSE '❌ NOT ENABLED - Run: CREATE EXTENSION IF NOT EXISTS pg_cron;'
  END AS status,
  extversion AS version
FROM pg_extension 
WHERE extname = 'pg_cron';

-- ============================================================================
-- STEP 2: Check Database Settings
-- ============================================================================
SELECT 
  'STEP 2: Database Settings' AS check_name,
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

-- If settings are missing, you need to set them:
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';

-- ============================================================================
-- STEP 3: Check Cron Jobs Scheduled
-- ============================================================================
SELECT 
  'STEP 3: Cron Jobs' AS check_name,
  jobid,
  jobname,
  schedule,
  CASE 
    WHEN active THEN '✅ ACTIVE'
    ELSE '❌ INACTIVE'
  END AS status,
  CASE 
    WHEN jobname = 'process-emails' THEN 
      CASE 
        WHEN COUNT(*) = 0 THEN '❌ NOT SCHEDULED - Run migration to schedule'
        WHEN active = false THEN '❌ INACTIVE - Job exists but not active'
        ELSE '✅ SCHEDULED AND ACTIVE'
      END
    ELSE ''
  END AS email_processing_status
FROM cron.job
WHERE jobname IN ('process-emails', 'refresh-oauth-tokens', 'send-request-reminders', 'cleanup-expired-requests')
  OR jobname LIKE '%email%'
GROUP BY jobid, jobname, schedule, active
ORDER BY jobname;

-- ============================================================================
-- STEP 4: Check Recent Executions
-- ============================================================================
SELECT 
  'STEP 4: Recent Executions' AS check_name,
  j.jobname,
  jrd.start_time,
  jrd.end_time,
  jrd.status,
  CASE 
    WHEN jrd.status = 'succeeded' THEN '✅ SUCCESS'
    WHEN jrd.status = 'failed' THEN '❌ FAILED'
    WHEN jrd.status = 'running' THEN '⏳ RUNNING'
    ELSE jrd.status
  END AS status_display,
  jrd.return_message,
  EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time)) AS duration_seconds,
  CASE 
    WHEN j.jobname = 'process-emails' AND jrd.start_time < NOW() - INTERVAL '10 minutes' THEN 
      '⚠️ No recent execution - Should run every 5 minutes'
    WHEN j.jobname = 'process-emails' AND jrd.status = 'failed' THEN 
      '❌ Job is failing - Check return_message for details'
    ELSE ''
  END AS notes
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname = 'process-emails'
ORDER BY jrd.start_time DESC
LIMIT 10;

-- ============================================================================
-- STEP 5: Check for Active Email Accounts
-- ============================================================================
SELECT 
  'STEP 5: Active Email Accounts' AS check_name,
  COUNT(*) AS active_accounts,
  CASE 
    WHEN COUNT(*) = 0 THEN '⚠️ NO ACTIVE ACCOUNTS - No emails will be processed'
    ELSE '✅ ' || COUNT(*) || ' active account(s)'
  END AS status
FROM email_accounts
WHERE is_active = true;

-- ============================================================================
-- SUMMARY: Issues Found
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
    WHEN NOT EXISTS (
      SELECT 1 FROM cron.job_run_details jrd
      JOIN cron.job j ON j.jobid = jrd.jobid
      WHERE j.jobname = 'process-emails' 
        AND jrd.start_time > NOW() - INTERVAL '30 minutes'
        AND jrd.status = 'succeeded'
    ) THEN 
      '⚠️ WARNING: No successful executions in last 30 minutes'
    ELSE 
      '✅ All checks passed - Email processing should be working automatically'
  END AS overall_status;


