# Deploy Remaining Edge Functions - Quick Guide

**Status:** Ready to Deploy  
**Estimated Time:** 30-45 minutes  
**Priority:** Critical (Required for automation)

---

## Overview

Deploy the remaining Edge Functions that are code-complete but not yet deployed:
1. ✅ `process-emails` - Already deployed
2. ⏳ `refresh-tokens` - **Needs deployment**
3. ⏳ `send-reminders` - **Needs deployment**

---

## Prerequisites

- ✅ Supabase project: `nneyhfhdthpxmkemyenm`
- ✅ Project linked via CLI or Dashboard access
- ✅ Edge Function secrets configured (see Step 2)

---

## Step 1: Deploy `refresh-tokens` Edge Function

### Option A: Via Supabase Dashboard (Recommended - No Docker)

1. **Open Supabase Dashboard:**
   - Go to: https://app.supabase.com/project/nneyhfhdthpxmkemyenm
   - Navigate to: **Edge Functions**

2. **Create Function:**
   - Click **"Create Function"** button
   - Function name: `refresh-tokens`
   - Copy entire contents of: `supabase/functions/refresh-tokens/index.ts`
   - Paste into the function editor

3. **Deploy:**
   - Click **"Deploy"** button
   - Wait for deployment to complete (~30 seconds)

4. **Verify:**
   - Function should appear in list with status "Active"
   - Check logs for any errors

### Option B: Via CLI (Requires Docker)

```bash
cd /Users/pz/Documents/Apps/Docuflow_Cursor
supabase functions deploy refresh-tokens --no-verify-jwt
```

---

## Step 2: Deploy `send-reminders` Edge Function

### Option A: Via Supabase Dashboard (Recommended)

1. **In Supabase Dashboard:**
   - Go to: **Edge Functions** → **Create Function**
   - Function name: `send-reminders`
   - Copy entire contents of: `supabase/functions/send-reminders/index.ts`
   - Paste into the function editor

2. **Deploy:**
   - Click **"Deploy"** button
   - Wait for deployment to complete

### Option B: Via CLI

```bash
supabase functions deploy send-reminders --no-verify-jwt
```

---

## Step 3: Verify Edge Function Secrets

All Edge Functions need these secrets configured:

1. **Go to Supabase Dashboard:**
   - Navigate to: **Settings** → **Edge Functions** → **Secrets**

2. **Required Secrets:**
   - ✅ `ENCRYPTION_KEY` - Already set
   - ⚠️ `SUPABASE_URL` - Should be set
   - ⚠️ `SUPABASE_SERVICE_ROLE_KEY` - Should be set
   - ⚠️ `GOOGLE_CLIENT_ID` - Optional (for Gmail/Google Drive)
   - ⚠️ `GOOGLE_CLIENT_SECRET` - Optional (for Gmail/Google Drive)
   - ⚠️ `MICROSOFT_CLIENT_ID` - Optional (for Outlook/OneDrive)
   - ⚠️ `MICROSOFT_CLIENT_SECRET` - Optional (for Outlook/OneDrive)

3. **Set Missing Secrets:**
   ```bash
   # Via CLI (if needed)
   supabase secrets set ENCRYPTION_KEY=your-encryption-key
   supabase secrets set SUPABASE_URL=https://nneyhfhdthpxmkemyenm.supabase.co
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

---

## Step 4: Test Edge Functions Manually

### Test `refresh-tokens`

```bash
# Via curl
curl -X POST \
  'https://nneyhfhdthpxmkemyenm.supabase.co/functions/v1/refresh-tokens' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'

# Via Supabase CLI
supabase functions invoke refresh-tokens --no-verify-jwt
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Token refresh completed",
  "refreshed": 0,
  "errors": 0,
  "duration_ms": 123
}
```

### Test `send-reminders`

```bash
# Via curl
curl -X POST \
  'https://nneyhfhdthpxmkemyenm.supabase.co/functions/v1/send-reminders' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'

# Via Supabase CLI
supabase functions invoke send-reminders --no-verify-jwt
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Reminders sent",
  "sent": 0,
  "errors": 0,
  "duration_ms": 456
}
```

---

## Step 5: Configure Cron Jobs

After Edge Functions are deployed, set up automated execution:

### 5.1 Enable pg_cron Extension

**Via Supabase Dashboard:**
1. Go to: **Database** → **Extensions**
2. Search for `pg_cron`
3. Click **Enable** (toggle switch)

**Via SQL:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;
```

### 5.2 Set Database Configuration

**Via SQL Editor in Supabase Dashboard:**

```sql
-- Set Supabase URL
ALTER DATABASE postgres 
SET app.settings.supabase_url = 'https://nneyhfhdthpxmkemyenm.supabase.co';

-- Set service role key (get from Settings → API → service_role key)
ALTER DATABASE postgres 
SET app.settings.service_role_key = 'your-service-role-key-here';
```

⚠️ **Security Note:** The service role key should be kept secret. Only set it via SQL Editor in Supabase Dashboard.

### 5.3 Run Cron Jobs Migration

**Option A: Via Supabase Dashboard SQL Editor**

1. Copy contents of: `supabase/migrations/20250103000000_setup_cron_jobs.sql`
2. Paste into SQL Editor
3. Click **Run**

**Option B: Via CLI**

```bash
supabase db push
```

This creates 4 cron jobs:
1. **process-emails** - Every 5 minutes
2. **refresh-oauth-tokens** - Every hour at minute 0
3. **send-request-reminders** - Daily at 9:00 AM
4. **cleanup-expired-requests** - Daily at midnight

### 5.4 Verify Cron Jobs

Run this diagnostic script in SQL Editor:

```sql
-- Check cron jobs are scheduled
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname IN (
  'process-emails',
  'refresh-oauth-tokens',
  'send-request-reminders',
  'cleanup-expired-requests'
)
ORDER BY jobname;
```

**Expected Output:**
- 4 rows (one for each job)
- `active = true` for all jobs
- `schedule` showing cron expressions

---

## Step 6: Monitor and Verify

### Check Edge Function Logs

**Via Supabase Dashboard:**
1. Go to: **Edge Functions** → `refresh-tokens` → **Logs**
2. Check for any errors or warnings

**Via CLI:**
```bash
supabase functions logs refresh-tokens --limit 20
supabase functions logs send-reminders --limit 20
```

### Check Cron Job Execution

```sql
-- View recent cron job executions
SELECT 
  jobid,
  jobname,
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
ORDER BY start_time DESC
LIMIT 20;
```

### Test Complete Flow

1. **Create a document request** via dashboard
2. **Wait 5 minutes** for `process-emails` cron to run
3. **Check documents table** for processed emails
4. **Check activity logs** for processing activity

---

## Troubleshooting

### Edge Function Deployment Fails

- **Issue:** Function size too large
- **Solution:** Functions are already optimized, should deploy successfully
- **Check:** Look for specific error in deployment logs

### Secrets Not Found

- **Error:** "Missing ENCRYPTION_KEY" or "Missing SUPABASE_URL"
- **Solution:** Set secrets in Dashboard → Settings → Edge Functions → Secrets
- **Verify:** Check secrets are set correctly

### Cron Jobs Not Running

- **Check:** Run `diagnose-cron-jobs.sql` to identify issues
- **Common Issues:**
  - pg_cron extension not enabled
  - Database settings not configured
  - Service role key incorrect
  - Edge Functions not deployed

### Token Refresh Fails

- **Check:** OAuth client credentials are correct
- **Verify:** Refresh tokens are valid (not expired)
- **Solution:** Re-authenticate OAuth accounts if needed

---

## Verification Checklist

After completing all steps:

- [ ] `refresh-tokens` Edge Function deployed and active
- [ ] `send-reminders` Edge Function deployed and active
- [ ] All Edge Function secrets configured
- [ ] pg_cron extension enabled
- [ ] Database settings configured (`supabase_url`, `service_role_key`)
- [ ] Cron jobs migration executed
- [ ] All 4 cron jobs scheduled and active
- [ ] Manual test of `refresh-tokens` successful
- [ ] Manual test of `send-reminders` successful
- [ ] Cron job execution verified (check `cron.job_run_details`)

---

## Next Steps After Deployment

1. **Monitor for 24-48 hours** to ensure cron jobs run correctly
2. **Check logs regularly** for any errors
3. **Test end-to-end flows:**
   - Email processing
   - Token refresh
   - Reminder sending
4. **Update PROJECT_STATUS_MASTER.md** with deployment status

---

## Files Reference

- **Edge Functions:**
  - `supabase/functions/refresh-tokens/index.ts`
  - `supabase/functions/send-reminders/index.ts`
  - `supabase/functions/process-emails/index.ts` (already deployed)

- **Migrations:**
  - `supabase/migrations/20250103000000_setup_cron_jobs.sql`

- **Diagnostic Scripts:**
  - `diagnose-cron-jobs.sql`
  - `setup-cron-jobs.sql`

---

**Status:** Ready for Deployment  
**Last Updated:** After OneDrive file location visibility implementation

