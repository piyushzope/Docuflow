-- Script to verify cron jobs are running correctly
-- Run this in Supabase SQL Editor to check email processing cron job status

-- 1. Check if pg_cron extension is enabled
SELECT 
  extname AS extension_name,
  extversion AS version
FROM pg_extension 
WHERE extname = 'pg_cron';

-- 2. List all cron jobs
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname LIKE '%email%' OR jobname = 'process-emails'
ORDER BY jobname;

-- 3. Check recent executions of process-emails job
SELECT 
  j.jobname,
  jrd.runid,
  jrd.start_time,
  jrd.end_time,
  jrd.status,
  jrd.return_message,
  EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time)) AS duration_seconds
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname = 'process-emails'
ORDER BY jrd.start_time DESC
LIMIT 10;

-- 4. Check for failed executions in the last 24 hours
SELECT 
  j.jobname,
  jrd.runid,
  jrd.start_time,
  jrd.end_time,
  jrd.status,
  jrd.return_message
FROM cron.job_run_details jrd
JOIN cron.job j ON jrd.jobid = j.jobid
WHERE j.jobname = 'process-emails'
  AND jrd.status = 'failed'
  AND jrd.start_time > NOW() - INTERVAL '24 hours'
ORDER BY jrd.start_time DESC;

-- 5. Verify edge function exists and is accessible
-- (This should return a count of active email accounts if working)
SELECT 
  COUNT(*) AS active_email_accounts
FROM email_accounts
WHERE is_active = true;

-- 6. Check cron job execution history (if monitoring table exists)
SELECT 
  job_name,
  status,
  COUNT(*) AS execution_count,
  MAX(started_at) AS last_execution,
  AVG(duration_ms) FILTER (WHERE status = 'success') AS avg_duration_ms,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_count
FROM cron_job_executions
WHERE started_at >= NOW() - INTERVAL '7 days'
GROUP BY job_name, status
ORDER BY job_name, status;

-- Alternative: Use the view
SELECT * FROM cron_job_execution_status;

-- 7. Get recent failures with details
SELECT 
  job_name,
  started_at,
  completed_at,
  duration_ms,
  error_message,
  metadata
FROM cron_job_executions
WHERE status = 'failed'
  AND started_at >= NOW() - INTERVAL '24 hours'
ORDER BY started_at DESC
LIMIT 10;

-- 8. Check if jobs are running on schedule (last 24 hours)
SELECT 
  job_name,
  COUNT(*) AS executions_24h,
  MIN(started_at) AS first_execution,
  MAX(started_at) AS last_execution,
  COUNT(*) FILTER (WHERE status = 'success') AS success_count,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_count
FROM cron_job_executions
WHERE started_at >= NOW() - INTERVAL '24 hours'
GROUP BY job_name
ORDER BY job_name;

