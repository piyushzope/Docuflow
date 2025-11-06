# Fix Automatic Email Processing - Quick Reference Guide

## Problem

Emails are not being processed automatically every 5 minutes. Users must manually click "Process Emails Now" button. The cron job exists but isn't running.

## Quick Fix (5 minutes)

### Step 1: Generate Fix Script

Run the automated fix script:

```bash
node fix-automatic-email-processing.js
```

This reads your `apps/web/.env.local` file and generates `fix-automatic-email-processing.sql` with your actual Supabase URL and service role key.

### Step 2: Run SQL in Supabase Dashboard

1. Open **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Open the generated file: `fix-automatic-email-processing.sql`
4. Copy and paste the entire contents into the SQL Editor
5. Click **Run**

### Step 3: Verify Setup

The SQL script includes verification queries that will show:
- ✅ pg_cron extension status
- ✅ Database settings configuration
- ✅ Cron job scheduling status
- ✅ Active email accounts count

Look for ✅ (green checkmarks) in the output. If you see ❌ (red X), check the troubleshooting section below.

### Step 4: Wait and Monitor

1. **Wait 5-10 minutes** for the first cron job execution
2. **Check execution history** in Supabase SQL Editor:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-emails')
   ORDER BY start_time DESC 
   LIMIT 10;
   ```
3. **Check Edge Function logs**: Supabase Dashboard → Edge Functions → process-emails → Logs

### Step 5: Clean Up (Security)

Delete the generated SQL file after use (it contains your service role key):

```bash
rm fix-automatic-email-processing.sql
```

---

## What the Fix Does

The fix script:

1. **Enables pg_cron extension** - Required for scheduled jobs in PostgreSQL
2. **Configures database settings**:
   - `app.settings.supabase_url` - Your Supabase project URL
   - `app.settings.service_role_key` - Service role key for authentication
3. **Unschedule existing job** - Removes any duplicate or broken cron jobs
4. **Schedules new cron job** - Creates `process-emails` job that runs every 5 minutes
5. **Verifies setup** - Runs diagnostic queries to confirm everything is working

---

## Verification

### Check Cron Job Status

Run this in Supabase SQL Editor:

```sql
-- Check if job is scheduled and active
SELECT 
  jobname,
  schedule,
  CASE WHEN active THEN '✅ ACTIVE' ELSE '❌ INACTIVE' END AS status
FROM cron.job
WHERE jobname = 'process-emails';
```

**Expected**: `process-emails` should show `✅ ACTIVE` with schedule `*/5 * * * *`

### Check Recent Executions

```sql
-- Check if jobs are actually running
SELECT 
  j.jobname,
  jrd.start_time,
  jrd.status,
  jrd.return_message,
  EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time)) AS duration_seconds
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname = 'process-emails'
ORDER BY jrd.start_time DESC
LIMIT 10;
```

**Expected**: Recent rows with `status = 'succeeded'` within the last 10-15 minutes

### Run Full Diagnostics

Use the comprehensive diagnostic script:

```sql
-- Run diagnose-cron-jobs.sql in SQL Editor
```

Or manually check:

```sql
-- Check extension
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check settings
SELECT name, setting FROM pg_settings WHERE name LIKE 'app.settings.%';

-- Check jobs
SELECT * FROM cron.job WHERE jobname = 'process-emails';

-- Check executions
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-emails')
ORDER BY start_time DESC LIMIT 5;
```

---

## Troubleshooting

### Issue: "pg_cron extension not found"

**Symptoms**: Error message when running the fix script

**Solution**:
1. Go to **Supabase Dashboard** → **Database** → **Extensions**
2. Search for `pg_cron`
3. Click **Enable** (toggle switch)

Or via SQL:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;
```

### Issue: "Database settings not configured"

**Symptoms**: Verification shows `❌ NOT CONFIGURED` for database settings

**Solution**: The fix script should configure these automatically. If it doesn't:

1. Check your `.env.local` file has the correct values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. Manually set them:
   ```sql
   ALTER DATABASE postgres 
   SET app.settings.supabase_url = 'https://your-project.supabase.co';
   
   ALTER DATABASE postgres 
   SET app.settings.service_role_key = 'your-service-role-key';
   ```

3. Verify:
   ```sql
   SELECT name, setting FROM pg_settings WHERE name LIKE 'app.settings.%';
   ```

### Issue: "Cron jobs exist but not executing"

**Symptoms**: Job shows as active but no executions in `cron.job_run_details`

**Check**:
1. **Are jobs active?**
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'process-emails';
   ```
   Should show `active = true`

2. **Check execution history for errors**:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-emails')
   ORDER BY start_time DESC 
   LIMIT 5;
   ```
   Look for `status = 'failed'` and check `return_message` for error details

3. **Check if pg_cron is enabled**:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

### Issue: "Edge Function not found" errors

**Symptoms**: Cron job executions show errors about Edge Function not found

**Solution**:
1. **Verify Edge Function is deployed**:
   ```bash
   supabase functions list
   ```
   Should show `process-emails` in the list

2. **Check function name matches exactly** (case-sensitive): `process-emails`

3. **Verify URL is correct** in database settings:
   ```sql
   SELECT setting FROM pg_settings WHERE name = 'app.settings.supabase_url';
   ```
   Should match your Supabase project URL

4. **Deploy Edge Function if missing**:
   ```bash
   supabase functions deploy process-emails
   ```

### Issue: "Authentication errors"

**Symptoms**: Cron job executions fail with 401/403 errors

**Solution**:
1. **Verify service role key is correct**:
   - Go to **Supabase Dashboard** → **Settings** → **API**
   - Copy the **service_role** key (not anon key)
   - Update database setting:
     ```sql
     ALTER DATABASE postgres 
     SET app.settings.service_role_key = 'your-service-role-key';
     ```

2. **Check service role key hasn't changed** (regenerate if needed)

3. **Ensure Edge Function accepts service role key authentication**

### Issue: "Jobs running but emails not processing"

**Symptoms**: Cron jobs execute successfully but emails aren't being processed

**Check**:
1. **Are there active email accounts?**
   ```sql
   SELECT COUNT(*) FROM email_accounts WHERE is_active = true;
   ```
   If 0, no emails will be processed

2. **Check Edge Function logs** for errors:
   - Supabase Dashboard → Edge Functions → process-emails → Logs

3. **Verify email account tokens are valid** (not expired):
   - Check token status in `/dashboard/integrations`
   - Reconnect accounts if tokens are expired

4. **Check storage configuration is active**:
   ```sql
   SELECT * FROM storage_configs WHERE is_active = true;
   ```

### Issue: "No recent execution - Should run every 5 minutes"

**Symptoms**: Diagnostic shows no executions in the last 10 minutes

**Solution**:
1. **Wait 5-10 minutes** - First execution may be delayed
2. **Check if job is active**:
   ```sql
   SELECT active FROM cron.job WHERE jobname = 'process-emails';
   ```
3. **Check for errors** in recent executions
4. **Verify pg_cron is working**:
   ```sql
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
   ```
   If no jobs are running at all, pg_cron may not be enabled

---

## Manual Alternative

If the automated script doesn't work, you can manually set up the cron job:

### Step 1: Get Your Credentials

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Copy **Project URL** (e.g., `https://nneyhfhdthpxmkemyenm.supabase.co`)
3. Copy **service_role** key (keep this secret!)

### Step 2: Enable pg_cron

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;
```

### Step 3: Configure Settings

```sql
ALTER DATABASE postgres 
SET app.settings.supabase_url = 'https://your-project.supabase.co';

ALTER DATABASE postgres 
SET app.settings.service_role_key = 'your-service-role-key';
```

### Step 4: Schedule Job

```sql
-- Remove existing job if present
SELECT cron.unschedule('process-emails') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-emails'
);

-- Schedule new job
SELECT cron.schedule(
  'process-emails',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/process-emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

---

## Files

- **`fix-automatic-email-processing.js`** - Automated fix script (generates SQL)
- **`fix-automatic-email-processing.sql`** - Generated SQL fix (delete after use)
- **`diagnose-cron-jobs.sql`** - Comprehensive diagnostic script
- **`verify-cron-jobs.sql`** - Alternative verification script

---

## Security Notes

- ⚠️ **Service Role Key**: Never expose in client-side code or commit to git
- ⚠️ **Generated SQL file**: Contains sensitive keys - delete after use
- ✅ **Database Settings**: Only accessible server-side (safe for cron jobs)
- ✅ **Edge Function Secrets**: Stored securely by Supabase

---

## Related Documentation

- `FIX_EMAIL_PROCESSING_AUTOMATION.md` - Detailed troubleshooting guide
- `CRON_JOBS_SETUP_COMPLETE.md` - Complete cron jobs setup guide
- `SUPABASE_CRON_SETUP.md` - Supabase-specific cron setup
- `diagnose-cron-jobs.sql` - Diagnostic script

---

## Success Indicators

After running the fix, you should see:

1. ✅ **Cron job scheduled and active**
2. ✅ **Recent successful executions** in `cron.job_run_details`
3. ✅ **Emails processed automatically** (check Edge Function logs)
4. ✅ **No manual intervention needed** - emails process every 5 minutes

---

**Status**: Ready to use

**Estimated Time**: 5-10 minutes

**Next Steps**: After fixing, monitor for 24 hours to ensure stability

