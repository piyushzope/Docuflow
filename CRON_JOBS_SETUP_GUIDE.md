# Cron Jobs Setup Guide

**Purpose:** Configure Supabase Cron jobs for automated email processing, token refresh, and reminders.

**Status:** Migration files created, ready for deployment

---

## 📋 Prerequisites

1. **Supabase Project** - Hosted project at https://supabase.com
2. **Database Access** - SQL Editor access or Supabase CLI
3. **Edge Functions Deployed:**
   - ✅ `process-emails` (already deployed)
   - ⚠️ `refresh-tokens` (needs deployment)
   - ✅ `send-reminders` (already exists)

---

## 🚀 Step-by-Step Setup

### Step 1: Enable pg_cron Extension

**Via Supabase Dashboard:**
1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Extensions**
3. Search for `pg_cron`
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

---

### Step 2: Set Database Configuration

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to **Project Settings** → **Database**
2. Scroll to **Database Settings**
3. Add custom settings:
   - Setting name: `app.settings.supabase_url`
   - Value: `https://your-project-id.supabase.co`
   
   - Setting name: `app.settings.service_role_key`  
   - Value: Your service role key (from **Settings** → **API** → **service_role** key)

**Option B: Via SQL (Less Secure)**

```sql
ALTER DATABASE postgres 
SET app.settings.supabase_url = 'https://your-project-id.supabase.co';

-- Note: Service role key should NOT be set as database setting for security
-- Use Supabase secrets or environment variables instead
```

**⚠️ Security Note:** The service role key should be stored in Supabase Edge Function secrets, not as a database setting. See Step 4.

---

### Step 3: Deploy Edge Functions

#### Deploy refresh-tokens Function

**Via Supabase Dashboard:**
1. Go to **Edge Functions** → **Create Function**
2. Function name: `refresh-tokens`
3. Copy contents from: `supabase/functions/refresh-tokens/index.ts`
4. Click **Deploy**

**Via CLI:**
```bash
cd /Users/pz/Documents/Apps/Docuflow_Cursor
supabase functions deploy refresh-tokens --no-verify-jwt
```

**Verify Deployment:**
- Check **Edge Functions** dashboard
- Function should show as "Active"

---

### Step 4: Set Edge Function Secrets

**Via Supabase Dashboard:**
1. Go to **Edge Functions** → **Settings** → **Secrets**
2. Add the following secrets:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENCRYPTION_KEY=your-encryption-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
```

**⚠️ Important:** 
- Get `SUPABASE_URL` from **Settings** → **API** → **Project URL**
- Get `SUPABASE_SERVICE_ROLE_KEY` from **Settings** → **API** → **service_role** key
- Get `ENCRYPTION_KEY` from your `.env.local` or set a new one
- OAuth credentials from your Google Cloud Console and Azure Portal

---

### Step 5: Run Cron Jobs Migration

**Via Supabase Dashboard:**
1. Go to **SQL Editor**
2. Open file: `supabase/migrations/20250103000001_update_cron_jobs_config.sql`
3. Copy the SQL content
4. Paste into SQL Editor
5. Click **Run**

**Via CLI:**
```bash
supabase db push
```

**Migration File:** `supabase/migrations/20250103000001_update_cron_jobs_config.sql`

This migration:
- Unschedules any existing jobs (cleanup)
- Schedules 4 cron jobs:
  1. `process-emails` - Every 5 minutes
  2. `refresh-oauth-tokens` - Every hour
  3. `send-request-reminders` - Daily at 9 AM
  4. `cleanup-expired-requests` - Daily at midnight

---

### Step 6: Verify Cron Jobs

**Check Jobs Are Scheduled:**
```sql
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname IN ('process-emails', 'refresh-oauth-tokens', 'send-request-reminders', 'cleanup-expired-requests')
ORDER BY jobname;
```

**Check Recent Executions:**
```sql
SELECT 
  j.jobname,
  jrd.start_time,
  jrd.end_time,
  jrd.status,
  jrd.return_message
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname IN ('process-emails', 'refresh-oauth-tokens', 'send-request-reminders', 'cleanup-expired-requests')
ORDER BY jrd.start_time DESC
LIMIT 20;
```

**Expected Result:**
- 4 jobs should be listed
- All jobs should have `active = true`
- Jobs will start running on their schedules

---

### Step 7: Test Edge Functions Manually

**Test refresh-tokens:**
```bash
# Get service role key from Supabase Dashboard
export SUPABASE_SERVICE_ROLE_KEY="your-key"
curl -X POST \
  'https://your-project-id.supabase.co/functions/v1/refresh-tokens' \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

**Test process-emails:**
```bash
curl -X POST \
  'https://your-project-id.supabase.co/functions/v1/process-emails' \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
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

---

## 🔍 Troubleshooting

### Issue: Cron jobs not running

**Check:**
1. Is `pg_cron` extension enabled?
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. Are jobs scheduled?
   ```sql
   SELECT * FROM cron.job WHERE jobname LIKE '%email%';
   ```

3. Check execution logs:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'process-emails')
   ORDER BY start_time DESC LIMIT 5;
   ```

4. Check for errors in return_message field

### Issue: Edge Function errors

**Check:**
1. Edge Function logs in Supabase Dashboard
2. Verify all secrets are set correctly
3. Test function manually (see Step 7)
4. Check function code for errors

### Issue: Database settings not found

**Solution:**
Update cron jobs migration to use Supabase secrets instead:
```sql
-- Instead of current_setting(), use secrets API
-- Or update migration to pass secrets via Edge Function environment
```

---

## 📊 Monitoring

### View Job Status

```sql
-- All cron jobs
SELECT * FROM cron.job ORDER BY jobname;

-- Recent executions
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 20;
```

### Monitor in Supabase Dashboard

1. **Edge Functions** → View logs for each function
2. **Database** → **Logs** → Check for cron job errors
3. **Monitoring** → Set up alerts for failed jobs

---

## ✅ Verification Checklist

- [ ] `pg_cron` extension enabled
- [ ] Database settings configured (or using secrets)
- [ ] `refresh-tokens` Edge Function deployed
- [ ] All Edge Function secrets set
- [ ] Cron jobs migration run successfully
- [ ] 4 cron jobs scheduled and active
- [ ] Jobs executing successfully (check logs)
- [ ] Manual function tests passing

---

## 📝 Next Steps After Setup

1. **Monitor first executions** - Wait for first scheduled runs and verify logs
2. **Test email processing** - Send a test document request and verify processing
3. **Test token refresh** - Let a token expire and verify refresh works
4. **Set up alerts** - Configure notifications for failed cron jobs

---

## 🔗 Related Documentation

- `supabase/migrations/20250103000001_update_cron_jobs_config.sql` - Migration file
- `supabase/functions/refresh-tokens/index.ts` - Token refresh function
- `supabase/functions/process-emails/index.ts` - Email processing function
- `supabase/functions/send-reminders/index.ts` - Reminders function
- `SUPABASE_CRON_SETUP.md` - Original cron setup documentation

---

## 🆘 Support

If you encounter issues:
1. Check Supabase logs (Dashboard → Logs)
2. Verify Edge Function logs
3. Check cron job execution history (SQL queries above)
4. Review Edge Function code for errors

**Common Issues:**
- Missing secrets → Function will fail with "Missing ENCRYPTION_KEY" errors
- Invalid service role key → Jobs will fail with 401 errors
- Network issues → Check Supabase status page

