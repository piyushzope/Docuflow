# Fix Email Processing Automation

## Problem

Email processing still needs to be triggered manually. The automated cron jobs that should process emails every 5 minutes are not running.

## Root Cause

The cron jobs are configured but likely not set up properly. Common issues:

1. **pg_cron extension not enabled** - Required for scheduled jobs in PostgreSQL
2. **Database settings not configured** - Cron jobs need Supabase URL and service role key
3. **Cron jobs not scheduled** - Migration may not have been run
4. **Cron jobs failing silently** - Check execution history for errors

## Quick Fix (Recommended)

### Option 1: Automated Script (Easiest)

1. **Generate the fix SQL with your actual values:**

```bash
node generate-cron-fix.js
```

This reads your `apps/web/.env.local` file and generates `fix-cron-jobs-with-values.sql` with your actual Supabase URL and service role key.

2. **Run the generated SQL in Supabase Dashboard:**

   - Open Supabase Dashboard → SQL Editor
   - Copy contents of `fix-cron-jobs-with-values.sql`
   - Paste and click "Run"
   - Wait 5-10 minutes for first execution

3. **Verify it's working:**

   - Run `diagnose-cron-jobs.sql` in SQL Editor
   - Check for ✅ status on all checks

4. **Clean up (security):**

```bash
rm fix-cron-jobs-with-values.sql  # Contains sensitive keys
```

### Option 2: Manual Setup

1. **Get your credentials:**

   - Go to Supabase Dashboard → Settings → API
   - Copy **Project URL** (e.g., `https://nneyhfhdthpxmkemyenm.supabase.co`)
   - Copy **service_role** key (keep this secret!)

2. **Enable pg_cron extension:**

   - Go to Supabase Dashboard → Database → Extensions
   - Search for `pg_cron`
   - Click **Enable** (toggle switch)

   Or via SQL:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   GRANT USAGE ON SCHEMA cron TO postgres;
   ```

3. **Configure database settings:**

   Open SQL Editor and run (replace with your actual values):

   ```sql
   -- Set Supabase URL
   ALTER DATABASE postgres 
   SET app.settings.supabase_url = 'https://your-project.supabase.co';
   
   -- Set Service Role Key
   ALTER DATABASE postgres 
   SET app.settings.service_role_key = 'your-service-role-key';
   ```

4. **Schedule cron jobs:**

   - Open `fix-cron-jobs.sql` in a text editor
   - Replace `YOUR_SUPABASE_URL` with your actual URL
   - Replace `YOUR_SERVICE_ROLE_KEY` with your actual key
   - Copy and paste into Supabase SQL Editor
   - Click "Run"

5. **Verify setup:**

   Run `diagnose-cron-jobs.sql` in SQL Editor to check status.

## Verification Steps

After setup, verify everything is working:

### Step 1: Check Cron Jobs Status

Run this in Supabase SQL Editor:

```sql
-- Check jobs are scheduled and active
SELECT 
  jobname,
  schedule,
  CASE WHEN active THEN '✅ ACTIVE' ELSE '❌ INACTIVE' END AS status
FROM cron.job
WHERE jobname = 'process-emails';
```

Expected: `process-emails` should show `✅ ACTIVE` with schedule `*/5 * * * *`

### Step 2: Check Recent Executions

```sql
-- Check if jobs are actually running
SELECT 
  j.jobname,
  jrd.start_time,
  jrd.status,
  jrd.return_message
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname = 'process-emails'
ORDER BY jrd.start_time DESC
LIMIT 5;
```

Expected: Recent rows with `status = 'succeeded'` within the last 10-15 minutes

### Step 3: Check Edge Function Logs

1. Go to Supabase Dashboard → Edge Functions
2. Click on `process-emails`
3. Check "Logs" tab for recent executions
4. Look for successful processing messages

### Step 4: Test Manually (Optional)

You can manually trigger email processing to test:

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/process-emails" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Or use the API route in your app:

```bash
curl -X POST http://localhost:3000/api/process-emails
```

## Troubleshooting

### Issue: "pg_cron extension not found"

**Solution:**
- Enable it via Dashboard: Database → Extensions → pg_cron → Enable
- Or via SQL: `CREATE EXTENSION IF NOT EXISTS pg_cron;`

### Issue: "Database settings not configured"

**Solution:**
- Set `app.settings.supabase_url` and `app.settings.service_role_key`
- Use `ALTER DATABASE postgres SET app.settings.key = 'value';`
- Verify with: `SELECT name, setting FROM pg_settings WHERE name LIKE 'app.settings.%';`

### Issue: "Cron jobs exist but not executing"

**Check:**
1. Are jobs `active = true`? Run: `SELECT * FROM cron.job WHERE jobname = 'process-emails';`
2. Check execution history: `SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-emails') ORDER BY start_time DESC LIMIT 5;`
3. Look for error messages in `return_message` column

### Issue: "Edge Function not found" errors

**Solution:**
1. Verify Edge Function is deployed: `supabase functions list`
2. Check function name matches exactly (case-sensitive): `process-emails`
3. Verify URL is correct in database settings

### Issue: "Authentication errors"

**Solution:**
1. Verify `app.settings.service_role_key` is set correctly
2. Check service role key hasn't changed (regenerate if needed)
3. Ensure Edge Function accepts service role key authentication

### Issue: "Jobs running but emails not processing"

**Check:**
1. Are there active email accounts? `SELECT COUNT(*) FROM email_accounts WHERE is_active = true;`
2. Check Edge Function logs for errors
3. Verify email account tokens are valid (not expired)
4. Check storage configuration is active

## Files Created

- `diagnose-cron-jobs.sql` - Diagnostic script to check cron job status
- `fix-cron-jobs.sql` - Fix script template (needs values filled in)
- `generate-cron-fix.js` - Helper script to generate fix SQL from .env.local
- `FIX_EMAIL_PROCESSING_AUTOMATION.md` - This guide

## Next Steps

After fixing:

1. ✅ **Monitor first 24 hours** - Check cron job executions are successful
2. ✅ **Set up alerts** (if available) - Get notified of failures
3. ✅ **Check email processing** - Verify emails are being processed automatically
4. ✅ **Review logs** - Check Edge Function logs for any issues

## Security Notes

- ⚠️ **Service Role Key**: Never expose in client-side code or commit to git
- ⚠️ **Generated SQL file**: Contains sensitive keys - delete after use
- ✅ **Database Settings**: Only accessible server-side (safe for cron jobs)
- ✅ **Edge Function Secrets**: Stored securely by Supabase

## Related Documentation

- `CRON_JOBS_SETUP_COMPLETE.md` - Complete cron jobs setup guide
- `SUPABASE_CRON_SETUP.md` - Supabase-specific cron setup
- `verify-cron-jobs.sql` - Alternative verification script

---

**Status**: Ready to fix

**Estimated Time**: 5-10 minutes


