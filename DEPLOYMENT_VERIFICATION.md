# 🔍 Deployment Verification Guide

**Purpose:** Verify that all components are properly deployed and configured

---

## Quick Verification

Run the automated verification script:

```bash
./verify-deployment.sh
```

This script checks:
- ✅ Supabase CLI installation
- ✅ Edge Functions deployment status
- ✅ Edge Functions HTTP responses
- ✅ Environment variables
- ✅ Required files existence

---

## Manual Verification Steps

### 1. Check Edge Functions Deployment

**Via Supabase CLI:**
```bash
supabase functions list
```

**Expected Output:**
```
process-emails     Active
refresh-tokens     Active
send-reminders     Active
```

**Via HTTP Test:**
```bash
# Test process-emails
curl -X POST \
  "${SUPABASE_URL}/functions/v1/process-emails" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: HTTP 200 with JSON response
```

**Via Test Scripts:**
```bash
./test-process-emails.sh
./test-refresh-tokens.sh
./test-send-reminders.sh
```

---

### 2. Check Cron Jobs Configuration

**In Supabase SQL Editor:**

```sql
-- Check pg_cron is enabled
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'pg_cron';

-- List all cron jobs
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
WHERE jobname IN (
  'process-emails',
  'refresh-oauth-tokens',
  'send-request-reminders',
  'cleanup-expired-requests'
)
ORDER BY jobname;

-- Check recent executions
SELECT 
  j.jobname,
  jrd.start_time,
  jrd.status,
  jrd.return_message
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname IN (
  'process-emails',
  'refresh-oauth-tokens',
  'send-request-reminders'
)
ORDER BY jrd.start_time DESC
LIMIT 10;
```

**Expected:**
- 4 jobs should exist
- All should be `active = true`
- Recent executions should show `status = 'succeeded'`

**Or use the verification SQL:**
```sql
-- Run verify-cron-jobs.sql in SQL Editor
```

---

### 3. Check Database Settings

**In Supabase SQL Editor:**

```sql
-- Check database settings
SELECT name, setting 
FROM pg_settings 
WHERE name LIKE 'app.settings.%';

-- Expected:
-- app.settings.supabase_url = https://your-project.supabase.co
-- app.settings.service_role_key = (your service role key)
```

**Note:** Service role key should be stored securely. Consider using Supabase Vault instead of database settings.

---

### 4. Check Edge Function Secrets

**Via Supabase Dashboard:**
1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Verify these secrets exist:
   - `ENCRYPTION_KEY` - Required for token encryption
   - `SUPABASE_URL` - Optional (can use env var)
   - `SUPABASE_SERVICE_ROLE_KEY` - Optional (can use env var)

**Via Supabase CLI:**
```bash
supabase secrets list
```

---

### 5. Test UI Components

**Manual Testing:**
1. Start dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/dashboard/integrations`
3. Test buttons:
   - **"Process Emails Now"** - Should show success toast
   - **"Refresh Tokens"** - Should show success toast
   - **"Check Token Status"** - Should show token status

**Expected Behavior:**
- Buttons should be enabled
- Clicking should show loading state
- Success/error toasts should appear
- Console should show detailed logs

---

### 6. End-to-End Test

**Test Email Processing:**
1. Create a document request
2. Send email reply (or use test email)
3. Manually trigger: **"Process Emails Now"**
4. Verify:
   - Document appears in dashboard
   - Request status updates
   - Activity log entry created

**Test Token Refresh:**
1. Click **"Refresh Tokens"**
2. Verify:
   - Toast shows success
   - Token status updates
   - No errors in console

---

## Troubleshooting

### Edge Functions Not Deployed

**Symptom:** HTTP 404 when calling Edge Function

**Solution:**
1. Deploy via Supabase Dashboard:
   - Go to **Edge Functions** → **Create Function**
   - Copy code from `supabase/functions/[name]/index.ts`
   - Deploy
2. Or deploy via CLI:
   ```bash
   supabase functions deploy process-emails
   supabase functions deploy refresh-tokens
   supabase functions deploy send-reminders
   ```

### Cron Jobs Not Running

**Symptom:** Jobs exist but no recent executions

**Solution:**
1. Check `pg_cron` extension is enabled
2. Verify database settings are configured
3. Check job schedule is correct
4. Review `cron.job_run_details` for errors

**Check for Errors:**
```sql
SELECT 
  j.jobname,
  jrd.status,
  jrd.return_message
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE jrd.status = 'failed'
ORDER BY jrd.start_time DESC
LIMIT 10;
```

### Token Refresh Fails

**Symptom:** Error when clicking "Refresh Tokens"

**Solution:**
1. Check `ENCRYPTION_KEY` secret is set
2. Verify OAuth credentials are correct
3. Check tokens haven't expired completely (may need reconnection)
4. Review Edge Function logs

### Database Settings Missing

**Symptom:** Cron jobs fail with "setting not found" error

**Solution:**
```sql
ALTER DATABASE postgres 
SET app.settings.supabase_url = 'https://your-project.supabase.co';

ALTER DATABASE postgres 
SET app.settings.service_role_key = 'your-service-role-key';
```

**Note:** For better security, use Supabase Vault or environment variables instead.

---

## Verification Checklist

Use this checklist to verify everything is deployed:

### Edge Functions
- [ ] `process-emails` deployed and responding
- [ ] `refresh-tokens` deployed and responding
- [ ] `send-reminders` deployed and responding
- [ ] All secrets configured (`ENCRYPTION_KEY`)

### Cron Jobs
- [ ] `pg_cron` extension enabled
- [ ] `process-emails` job scheduled (every 5 min)
- [ ] `refresh-oauth-tokens` job scheduled (every hour)
- [ ] `send-request-reminders` job scheduled (daily 9 AM)
- [ ] `cleanup-expired-requests` job scheduled (daily midnight)
- [ ] Database settings configured

### Environment
- [ ] `SUPABASE_URL` set
- [ ] `SERVICE_ROLE_KEY` set
- [ ] `ENCRYPTION_KEY` set (in Supabase secrets or env)

### UI Components
- [ ] "Process Emails Now" button works
- [ ] "Refresh Tokens" button works
- [ ] "Check Token Status" works
- [ ] Toast notifications appear
- [ ] Error messages display correctly

### End-to-End
- [ ] Email processing works
- [ ] Document status updates
- [ ] Token refresh works
- [ ] Reminders can be sent

---

## Next Steps

After verification:

1. **Monitor First 24 Hours:**
   - Check cron job executions
   - Verify no errors in logs
   - Confirm emails are being processed

2. **Set Up Monitoring (Optional):**
   - Monitor cron job failures
   - Alert on token expiration
   - Track email processing errors

3. **Documentation:**
   - Update deployment status
   - Note any issues found
   - Document configuration

---

## Quick Reference

### Verification Scripts
- `./verify-deployment.sh` - Automated verification
- `verify-cron-jobs.sql` - SQL verification queries

### Test Scripts
- `./test-process-emails.sh`
- `./test-refresh-tokens.sh`
- `./test-send-reminders.sh`

### Deployment Guides
- `QUICK_START_DEPLOYMENT.md` - Quick deployment
- `DEPLOYMENT_CHECKLIST_COMPLETE.md` - Complete checklist
- `CRON_JOBS_SETUP_COMPLETE.md` - Cron setup guide

---

**Status:** Ready to verify! 🚀

Run `./verify-deployment.sh` to get started.

