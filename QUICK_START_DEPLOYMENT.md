# 🚀 Quick Start Deployment Guide

**Estimated Time:** 50 minutes  
**Prerequisites:** Supabase project, OAuth credentials configured

---

## Overview

This guide will get you from code to production in ~50 minutes. All code is complete - you just need to deploy Edge Functions and configure cron jobs.

---

## Step 1: Deploy Edge Functions (25 min)

### 1.1 Deploy refresh-tokens Function (15 min)

1. Go to: https://app.supabase.com/project/nneyhfhdthpxmkemyenm
2. Navigate to: **Edge Functions** → **Create Function**
3. **Function Name:** `refresh-tokens`
4. **Copy Code:**
   - Open: `supabase/functions/refresh-tokens/index.ts`
   - Copy entire file contents
   - Paste into function editor
5. **Deploy:** Click **Deploy** button
6. **Set Secrets:**
   - Go to **Settings** → **Edge Functions** → **Secrets**
   - Ensure `ENCRYPTION_KEY` is set
   - Optional: Set OAuth credentials if not already set

**Verify:**
```bash
supabase functions list
# Should show refresh-tokens as ACTIVE
```

### 1.2 Deploy send-reminders Function (10 min)

1. **Edge Functions** → **Create Function**
2. **Function Name:** `send-reminders`
3. **Copy Code:**
   - Open: `supabase/functions/send-reminders/index.ts`
   - Copy entire file contents
   - Paste into function editor
4. **Deploy:** Click **Deploy** button
5. **Set Secrets:**
   - Verify `ENCRYPTION_KEY` is set

**Verify:**
```bash
supabase functions list
# Should show send-reminders as ACTIVE
```

---

## Step 2: Configure Cron Jobs (15 min)

### 2.1 Enable pg_cron Extension (2 min)

1. Go to: **Database** → **Extensions**
2. Search: `pg_cron`
3. Click **Enable** (toggle switch)

**Or via SQL:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;
```

### 2.2 Set Database Settings (5 min)

**Get Your Values:**
1. Go to **Settings** → **API**
2. Copy **Project URL** (e.g., `https://nneyhfhdthpxmkemyenm.supabase.co`)
3. Copy **service_role** key (keep secret!)

**Set Settings via SQL:**
```sql
ALTER DATABASE postgres 
SET app.settings.supabase_url = 'https://nneyhfhdthpxmkemyenm.supabase.co';

ALTER DATABASE postgres 
SET app.settings.service_role_key = 'your-service-role-key-here';
```

**Verify:**
```sql
SELECT name, setting 
FROM pg_settings 
WHERE name LIKE 'app.settings.%';
```

### 2.3 Run Cron Jobs Setup (5 min)

1. Go to: **SQL Editor**
2. Open: `setup-cron-jobs.sql`
3. Copy entire file contents
4. Paste into SQL Editor
5. Click **Run**

**Verify Jobs:**
```sql
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname IN ('process-emails', 'refresh-oauth-tokens', 'send-request-reminders', 'cleanup-expired-requests')
ORDER BY jobname;
```

**Expected:**
- 4 jobs should exist
- All should be `active = true`
- Schedules should match expected values

---

## Step 3: Verify Everything Works (10 min)

### 3.1 Test Edge Functions

**Test refresh-tokens:**
```bash
./test-refresh-tokens.sh
```

**Test send-reminders:**
```bash
./test-send-reminders.sh
```

**Test email processing:**
```bash
./test-process-emails.sh
```

### 3.2 Test UI Buttons

1. Go to: `http://localhost:3000/dashboard/integrations`
2. Click **"Process Emails Now"** - Should show success
3. Click **"Refresh Tokens"** - Should show success
4. Click **"Check Token Status"** - Should show token status

### 3.3 Verify Cron Jobs

**Check Recent Executions:**
```sql
SELECT 
  j.jobname,
  jrd.start_time,
  jrd.status,
  jrd.return_message
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname IN ('process-emails', 'refresh-oauth-tokens', 'send-request-reminders')
ORDER BY jrd.start_time DESC
LIMIT 10;
```

**Expected:**
- Jobs should have recent executions
- Status should be "succeeded"
- No errors in return_message

---

## Troubleshooting

### Edge Function Not Found (404)

- Verify function name matches exactly (case-sensitive)
- Check function is deployed: `supabase functions list`
- Verify secrets are set

### Cron Jobs Not Running

- Check `pg_cron` extension is enabled
- Verify database settings are configured
- Check jobs are scheduled: `SELECT * FROM cron.job WHERE active = true`
- Look for errors: `SELECT * FROM cron.job_run_details WHERE status = 'failed'`

### Token Refresh Fails

- Check `ENCRYPTION_KEY` secret is set
- Verify OAuth credentials are correct
- Check tokens haven't expired completely (may need reconnection)

---

## What's Next?

After deployment:

1. **Monitor First 24 Hours:**
   - Check cron job executions
   - Verify no errors in logs
   - Confirm emails are being processed

2. **Test End-to-End:**
   - Create document request
   - Send email reply
   - Verify document appears
   - Check status updates

3. **Set Up Monitoring (Optional):**
   - Monitor cron job failures
   - Alert on token expiration
   - Track email processing errors

---

## Quick Reference

### Edge Functions
- `process-emails` ✅ Deployed
- `refresh-tokens` ⚠️ Deploy Now
- `send-reminders` ⚠️ Deploy Now

### Cron Jobs
- `process-emails` - Every 5 minutes
- `refresh-oauth-tokens` - Every hour
- `send-request-reminders` - Daily 9 AM
- `cleanup-expired-requests` - Daily midnight

### Test Scripts
- `./test-process-emails.sh`
- `./test-refresh-tokens.sh`
- `./test-send-reminders.sh`

### Documentation
- **Master Status:** `PROJECT_STATUS_MASTER.md`
- **Complete Deployment:** `DEPLOYMENT_CHECKLIST_COMPLETE.md`
- **Cron Setup:** `CRON_JOBS_SETUP_COMPLETE.md`
- **Testing Guide:** `COMPLETE_TESTING_GUIDE.md`

---

**Status:** Ready to Deploy! 🚀

**Total Time:** ~50 minutes

