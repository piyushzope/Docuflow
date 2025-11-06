# Supabase Cron Jobs Setup Guide

This guide explains how to set up and use Supabase Cron jobs (pg_cron) for automated email processing and maintenance tasks in Docuflow.

---

## Overview

Supabase Cron jobs use PostgreSQL's `pg_cron` extension to schedule recurring tasks. This approach is:
- ✅ **Serverless** - No long-running processes needed
- ✅ **Cost-effective** - Pay per execution, not uptime
- ✅ **Reliable** - Managed by Supabase
- ✅ **Simple** - SQL-based configuration

---

## Prerequisites

1. **Supabase Project** with pg_cron extension enabled
2. **Edge Functions** deployed
3. **Database settings** configured for cron jobs

---

## Step 1: Enable pg_cron Extension

The pg_cron extension should be enabled in your Supabase project. If it's not:

1. Go to Supabase Dashboard → Database → Extensions
2. Search for "pg_cron" and enable it
3. OR run this SQL:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

---

## Step 2: Configure Database Settings

Before running cron jobs, you need to set database-level settings for Supabase URL and service role key.

### Option A: Via Supabase Dashboard

1. Go to **Settings** → **Database** → **Connection String**
2. Note your project URL and service role key

### Option B: Via SQL (Recommended for Production)

```sql
-- Set Supabase URL
ALTER DATABASE postgres 
SET app.settings.supabase_url = 'https://your-project-ref.supabase.co';

-- Set service role key (keep this secret!)
ALTER DATABASE postgres 
SET app.settings.service_role_key = 'your-service-role-key-here';
```

⚠️ **Security Warning**: The service role key bypasses Row Level Security. Never expose it in client-side code!

---

## Step 3: Run Migration

Run the cron jobs migration:

```bash
# Via Supabase CLI
supabase db push

# OR manually via SQL Editor in Supabase Dashboard
# Copy and paste contents of:
# supabase/migrations/20250103000000_setup_cron_jobs.sql
```

This creates 4 cron jobs:
1. **process-emails** - Every 5 minutes
2. **refresh-oauth-tokens** - Every hour
3. **send-request-reminders** - Daily at 9 AM
4. **cleanup-expired-requests** - Daily at midnight

---

## Step 4: Complete Edge Function Implementation

The Edge Function at `supabase/functions/process-emails/index.ts` is currently a skeleton. You need to:

1. **Port email integration logic** to Deno-compatible code
2. **Port storage adapter logic** to Deno
3. **Port routing rules logic** to Deno
4. **Test the function** manually before enabling cron

### Testing the Edge Function Manually

```bash
# Using Supabase CLI
supabase functions invoke process-emails

# OR via HTTP
curl -X POST \
  'https://your-project.supabase.co/functions/v1/process-emails' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

---

## Step 5: Verify Cron Jobs Are Running

### Check Cron Job Status

```sql
-- View all cron jobs
SELECT * FROM cron.job 
WHERE jobname IN (
  'process-emails',
  'refresh-oauth-tokens',
  'send-request-reminders',
  'cleanup-expired-requests'
)
ORDER BY jobname;
```

### View Execution History

```sql
-- View recent executions for email processing
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'process-emails'
)
ORDER BY start_time DESC
LIMIT 10;
```

### Check for Failures

```sql
-- View failed jobs
SELECT 
  j.jobname,
  jrd.status,
  jrd.return_message,
  jrd.start_time
FROM cron.job_run_details jrd
JOIN cron.job j ON jrd.jobid = j.jobid
WHERE jrd.status = 'failed'
  AND jrd.start_time > NOW() - INTERVAL '24 hours'
ORDER BY jrd.start_time DESC;
```

---

## Cron Job Details

### 1. Email Processing (`process-emails`)

**Schedule:** Every 5 minutes (`*/5 * * * *`)

**Purpose:** Process new emails for all active email accounts

**What it does:**
- Fetches all active email accounts
- Checks for new emails since last sync
- Applies routing rules
- Stores documents in configured storage
- Updates document request status

**Monitoring:**
```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-emails')
ORDER BY start_time DESC LIMIT 5;
```

---

### 2. OAuth Token Refresh (`refresh-oauth-tokens`)

**Schedule:** Every hour (`0 * * * *`)

**Purpose:** Refresh OAuth tokens before they expire

**What it does:**
- Finds accounts with tokens expiring in next hour
- Refreshes access tokens using refresh tokens
- Updates token expiration times

**Note:** The actual refresh logic needs to be implemented in the helper function or Edge Function.

---

### 3. Document Request Reminders (`send-request-reminders`)

**Schedule:** Daily at 9 AM (`0 9 * * *`)

**Purpose:** Send reminder emails for pending document requests

**What it does:**
- Finds requests due in 1-3 days
- Checks if reminder was sent in last 24 hours
- Sends reminder email via Edge Function
- Updates `last_reminder_sent` timestamp

---

### 4. Overdue Request Cleanup (`cleanup-expired-requests`)

**Schedule:** Daily at midnight (`0 0 * * *`)

**Purpose:** Mark expired requests and log cleanup activity

**What it does:**
- Marks requests as 'expired' if overdue by 7+ days
- Logs cleanup activity in activity_logs
- Keeps database clean and organized

---

## Modifying Cron Jobs

### Change Schedule

```sql
-- Update email processing to every 10 minutes
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'process-emails'),
  schedule := '*/10 * * * *'
);
```

### Pause a Job

```sql
-- Pause email processing
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'process-emails'),
  active := false
);
```

### Resume a Job

```sql
-- Resume email processing
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'process-emails'),
  active := true
);
```

### Remove a Job

```sql
-- Unschedule a cron job
SELECT cron.unschedule('process-emails');
```

---

## Troubleshooting

### Cron Jobs Not Running

1. **Check pg_cron is enabled:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. **Check job is active:**
   ```sql
   SELECT jobname, active FROM cron.job WHERE jobname = 'process-emails';
   ```

3. **Check execution history:**
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-emails')
   ORDER BY start_time DESC LIMIT 1;
   ```

### Edge Function Errors

1. **Test function manually** to see error messages
2. **Check Edge Function logs** in Supabase Dashboard
3. **Verify environment variables** are set correctly

### Token Refresh Failures

1. Check OAuth credentials are valid
2. Verify refresh token hasn't been revoked
3. Check Edge Function logs for detailed errors

---

## Best Practices

1. **Monitor Regularly**
   - Check cron job execution history weekly
   - Set up alerts for failed jobs (via Supabase monitoring or external tool)

2. **Error Handling**
   - Ensure Edge Functions handle errors gracefully
   - Log errors for debugging
   - Don't let one account's failure stop processing others

3. **Rate Limiting**
   - Be mindful of API rate limits (Gmail, Outlook)
   - Consider processing accounts in batches
   - Add delays if needed

4. **Testing**
   - Test Edge Functions manually before enabling cron
   - Start with longer intervals (e.g., every hour) then reduce
   - Monitor first few executions closely

5. **Security**
   - Never expose service role key
   - Use environment variables for sensitive data
   - Keep Edge Functions secure (verify Authorization header)

---

## Alternative: Calling External Service

If porting all logic to Deno is complex, you can have the cron job call your existing Node.js service:

```sql
SELECT cron.schedule(
  'process-emails-external',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-service.com/api/process-emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_API_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

This approach lets you keep your existing email worker code while still using Supabase Cron for scheduling.

---

## Monitoring Queries

### Daily Summary

```sql
-- Summary of all cron jobs today
SELECT 
  j.jobname,
  COUNT(*) as executions,
  SUM(CASE WHEN jrd.status = 'succeeded' THEN 1 ELSE 0 END) as succeeded,
  SUM(CASE WHEN jrd.status = 'failed' THEN 1 ELSE 0 END) as failed,
  AVG(EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time))) as avg_duration_seconds
FROM cron.job_run_details jrd
JOIN cron.job j ON jrd.jobid = j.jobid
WHERE jrd.start_time::date = CURRENT_DATE
GROUP BY j.jobname
ORDER BY j.jobname;
```

### Recent Errors

```sql
-- Recent failures with error messages
SELECT 
  j.jobname,
  jrd.return_message,
  jrd.start_time
FROM cron.job_run_details jrd
JOIN cron.job j ON jrd.jobid = j.jobid
WHERE jrd.status = 'failed'
  AND jrd.start_time > NOW() - INTERVAL '7 days'
ORDER BY jrd.start_time DESC;
```

---

## Next Steps

1. ✅ Complete Edge Function implementation
2. ✅ Test all cron jobs manually
3. ✅ Set up monitoring/alerting
4. ✅ Document any custom logic
5. ✅ Review and optimize schedules

---

**Last Updated:** 2025-01-03  
**Related Files:**
- `supabase/functions/process-emails/index.ts`
- `supabase/migrations/20250103000000_setup_cron_jobs.sql`

