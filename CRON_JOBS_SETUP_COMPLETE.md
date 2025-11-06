# Cron Jobs Setup - Complete Guide

## Overview

This guide will help you set up automated cron jobs for:
1. **Email Processing** - Every 5 minutes
2. **Token Refresh** - Every hour  
3. **Send Reminders** - Daily at 9 AM
4. **Cleanup Expired Requests** - Daily at midnight

## Prerequisites Checklist

- [ ] Supabase project created
- [ ] `process-emails` Edge Function deployed ✅
- [ ] `refresh-tokens` Edge Function deployed ⚠️ (needs deployment)
- [ ] `send-reminders` Edge Function exists ✅
- [ ] Database access (SQL Editor or CLI)

## Step-by-Step Setup

### Step 1: Enable pg_cron Extension

**Via Supabase Dashboard:**
1. Go to: https://app.supabase.com/project/nneyhfhdthpxmkemyenm
2. Navigate to: **Database** → **Extensions**
3. Search for: `pg_cron`
4. Click **Enable** (toggle switch)

**Via SQL:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;
```

**Verify:**
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

### Step 2: Configure Database Settings

**⚠️ Security Note:** For cron jobs to call Edge Functions, we need to store the Supabase URL and service role key as database settings. This is acceptable for Supabase-hosted projects since:
- Database settings are only accessible server-side
- Cron jobs run in secure database context
- Alternative approaches (environment variables) aren't available to pg_cron

**Get Your Values:**
1. Go to **Settings** → **API**
2. Copy **Project URL** (e.g., `https://nneyhfhdthpxmkemyenm.supabase.co`)
3. Copy **service_role** key (keep this secret!)

**Set Database Settings:**

**Option A: Via Supabase Dashboard**
1. Go to **Project Settings** → **Database**  
2. Scroll to **Database Settings** (if available)
3. Add custom settings:
   - `app.settings.supabase_url` = `https://nneyhfhdthpxmkemyenm.supabase.co`
   - `app.settings.service_role_key` = `your-service-role-key`

**Option B: Via SQL (Recommended)**
```sql
-- Set Supabase URL
ALTER DATABASE postgres 
SET app.settings.supabase_url = 'https://nneyhfhdthpxmkemyenm.supabase.co';

-- Set service role key
ALTER DATABASE postgres 
SET app.settings.service_role_key = 'your-service-role-key-here';
```

**Verify Settings:**
```sql
SELECT name, setting 
FROM pg_settings 
WHERE name LIKE 'app.settings.%';
```

### Step 3: Deploy Missing Edge Functions

#### Deploy refresh-tokens Function

**Via Supabase Dashboard:**
1. Go to **Edge Functions** → **Create Function**
2. Function name: `refresh-tokens`
3. Copy contents from: `supabase/functions/refresh-tokens/index.ts`
4. Paste and click **Deploy**
5. Set secrets (see Step 4)

**Verify:**
```bash
supabase functions list
# Should show refresh-tokens as ACTIVE
```

### Step 4: Set Edge Function Secrets

**Via Supabase Dashboard:**
1. Go to **Edge Functions** → **Settings** → **Secrets**
2. Add/verify these secrets:
   - `SUPABASE_URL` = `https://nneyhfhdthpxmkemyenm.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `your-service-role-key`
   - `ENCRYPTION_KEY` = `your-encryption-key`
   - `GOOGLE_CLIENT_ID` = `your-google-client-id` (optional)
   - `GOOGLE_CLIENT_SECRET` = `your-google-client-secret` (optional)
   - `MICROSOFT_CLIENT_ID` = `your-microsoft-client-id` (optional)
   - `MICROSOFT_CLIENT_SECRET` = `your-microsoft-client-secret` (optional)

### Step 5: Run Cron Jobs Migration

**Via Supabase Dashboard:**
1. Go to **SQL Editor**
2. Open: `supabase/migrations/20250103000001_update_cron_jobs_config.sql`
3. Copy the entire SQL content
4. Paste into SQL Editor
5. Click **Run**

**Via CLI:**
```bash
cd /Users/pz/Documents/Apps/Docuflow_Cursor
supabase db push
```

**What This Does:**
- Unschedules any existing jobs (cleanup)
- Schedules 4 cron jobs:
  1. `process-emails` - Every 5 minutes (`*/5 * * * *`)
  2. `refresh-oauth-tokens` - Every hour (`0 * * * *`)
  3. `send-request-reminders` - Daily at 9 AM (`0 9 * * *`)
  4. `cleanup-expired-requests` - Daily at midnight (`0 0 * * *`)

### Step 6: Verify Setup

Run the verification script:

```sql
-- Run this in Supabase SQL Editor
-- Or use: verify-cron-jobs.sql

-- 1. Check pg_cron is enabled
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'pg_cron';

-- 2. List all scheduled jobs
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

-- 3. Check recent executions
SELECT 
  j.jobname,
  jrd.start_time,
  jrd.status,
  jrd.return_message,
  EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time)) AS duration_seconds
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname IN ('process-emails', 'refresh-oauth-tokens', 'send-request-reminders', 'cleanup-expired-requests')
ORDER BY jrd.start_time DESC
LIMIT 20;

-- 4. Check for failed jobs in last 24 hours
SELECT 
  j.jobname,
  COUNT(*) as failure_count
FROM cron.job_run_details jrd
JOIN cron.job j ON jrd.jobid = j.jobid
WHERE j.jobname IN ('process-emails', 'refresh-oauth-tokens', 'send-request-reminders', 'cleanup-expired-requests')
  AND jrd.status = 'failed'
  AND jrd.start_time > NOW() - INTERVAL '24 hours'
GROUP BY j.jobname;
```

## Troubleshooting

### Jobs Not Running

1. **Check pg_cron is enabled:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. **Check jobs are scheduled:**
   ```sql
   SELECT * FROM cron.job WHERE active = true;
   ```

3. **Check database settings:**
   ```sql
   SELECT name, setting FROM pg_settings WHERE name LIKE 'app.settings.%';
   ```

4. **Check recent executions:**
   ```sql
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
   ```

### Edge Function Not Found Errors

- Verify Edge Function is deployed: `supabase functions list`
- Check Edge Function name matches exactly (case-sensitive)
- Verify URL is correct in database settings

### Authentication Errors

- Verify `app.settings.service_role_key` is set correctly
- Check service role key hasn't changed
- Ensure Edge Function accepts service role key authentication

### Jobs Running But Failing

- Check `cron.job_run_details` for error messages
- Verify Edge Function secrets are set
- Check Edge Function logs in Supabase Dashboard

## Manual Testing

### Test Email Processing

```sql
-- Manually trigger the cron job
SELECT cron.schedule('test-process-emails', NOW() + INTERVAL '1 minute', $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
$$);

-- Wait a minute, then check results
SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'test-process-emails');

-- Clean up test job
SELECT cron.unschedule('test-process-emails');
```

### Test Token Refresh

```sql
-- Manually trigger token refresh
SELECT cron.schedule('test-refresh-tokens', NOW() + INTERVAL '1 minute', $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/refresh-tokens',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
$$);
```

## Monitoring

### Create Monitoring View

```sql
CREATE OR REPLACE VIEW cron_job_monitoring AS
SELECT 
  j.jobname,
  j.schedule,
  j.active,
  COUNT(jrd.runid) as total_runs,
  COUNT(CASE WHEN jrd.status = 'succeeded' THEN 1 END) as successful_runs,
  COUNT(CASE WHEN jrd.status = 'failed' THEN 1 END) as failed_runs,
  MAX(jrd.start_time) as last_run,
  AVG(EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time))) as avg_duration_seconds
FROM cron.job j
LEFT JOIN cron.job_run_details jrd ON j.jobid = jrd.jobid
WHERE j.jobname IN ('process-emails', 'refresh-oauth-tokens', 'send-request-reminders', 'cleanup-expired-requests')
GROUP BY j.jobid, j.jobname, j.schedule, j.active;

-- Query the view
SELECT * FROM cron_job_monitoring ORDER BY jobname;
```

## Next Steps

1. ✅ **Verify cron jobs are running** using the verification queries above
2. ✅ **Monitor for failures** - Check daily for the first week
3. ✅ **Adjust schedules** if needed (e.g., process emails more/less frequently)
4. ✅ **Set up alerts** (if Supabase provides monitoring/alerting)

## Security Notes

- **Service Role Key**: Never expose in client-side code
- **Database Settings**: Only accessible server-side
- **Edge Function Secrets**: Stored securely by Supabase
- **Cron Jobs**: Run in secure database context

---

**Status**: Ready for Setup

**Files:**
- Migration: `supabase/migrations/20250103000001_update_cron_jobs_config.sql`
- Verification: `verify-cron-jobs.sql`

