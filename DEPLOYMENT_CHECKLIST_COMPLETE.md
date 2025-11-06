# 📋 Complete Deployment Checklist

## Overview

This checklist covers all implemented features and their deployment status. Follow this guide to get everything running in production.

---

## ✅ Completed Implementations

### 1. Email Processing System ✅

**Status:** Deployed and Active
- **Edge Function:** `process-emails` (Version 6, Active)
- **Features:**
  - Processes emails from all active accounts
  - Handles emails with/without attachments
  - Updates document request status
  - Applies routing rules
  - Stores documents in configured storage

**Manual Trigger:**
- UI Button: `/dashboard/integrations` → "Process Emails Now"
- API: `POST /api/process-emails`

**Verification:**
```bash
# Test via curl
curl -X POST 'https://nneyhfhdthpxmkemyenm.supabase.co/functions/v1/process-emails' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

---

### 2. Token Refresh System ✅

**Status:** Code Complete, Needs Deployment
- **Edge Function:** `refresh-tokens` (Code ready, not deployed)
- **Features:**
  - Refreshes Google OAuth tokens (Gmail, Google Drive)
  - Refreshes Microsoft OAuth tokens (Outlook, OneDrive)
  - Updates tokens before expiration
  - Handles encryption/decryption

**Files:**
- `supabase/functions/refresh-tokens/index.ts` ✅
- `apps/web/app/api/refresh-tokens/route.ts` ✅
- `apps/web/components/refresh-tokens-button.tsx` ✅

**Deployment Steps:**
1. Go to Supabase Dashboard → Edge Functions
2. Create/Edit function: `refresh-tokens`
3. Copy contents from `supabase/functions/refresh-tokens/index.ts`
4. Deploy
5. Set secrets: `ENCRYPTION_KEY`, OAuth credentials

**Manual Trigger:**
- UI Button: `/dashboard/integrations` → "Refresh Tokens"
- API: `POST /api/refresh-tokens`

---

### 3. Send Reminders System ✅

**Status:** Code Complete, Needs Deployment
- **Edge Function:** `send-reminders` (Code complete, not deployed)
- **Features:**
  - Finds requests needing reminders
  - Sends reminder emails via Gmail/Outlook
  - Updates last_reminder_sent timestamp
  - Logs activity

**Files:**
- `supabase/functions/send-reminders/index.ts` ✅

**Deployment Steps:**
1. Go to Supabase Dashboard → Edge Functions
2. Create/Edit function: `send-reminders`
3. Copy contents from `supabase/functions/send-reminders/index.ts`
4. Deploy
5. Set secrets: `ENCRYPTION_KEY`

**Testing:**
```bash
curl -X POST 'https://nneyhfhdthpxmkemyenm.supabase.co/functions/v1/send-reminders' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

---

### 4. Token Status UI ✅

**Status:** Deployed and Active
- **Component:** `EmailAccountStatus`
- **Features:**
  - Shows token expiration status
  - "Check Token Status" button
  - Displays token errors
  - "Reconnect Account" button

**Location:** `/dashboard/integrations`

---

### 5. Error Handling Improvements ✅

**Status:** Deployed and Active
- **Features:**
  - Detailed error messages in UI
  - Console logging for debugging
  - Token expiration detection
  - Error details in API responses

**Files:**
- `apps/web/components/process-emails-button.tsx` ✅
- `apps/web/app/api/process-emails/route.ts` ✅
- `supabase/functions/process-emails/index.ts` ✅

---

## 🚀 Deployment Steps

### Phase 1: Deploy Edge Functions

#### Step 1.1: Deploy refresh-tokens

**Via Supabase Dashboard:**
1. Navigate to: https://app.supabase.com/project/nneyhfhdthpxmkemyenm
2. Go to: **Edge Functions** → **Create Function**
3. Name: `refresh-tokens`
4. Copy code from: `supabase/functions/refresh-tokens/index.ts`
5. Paste and click **Deploy**

**Via CLI (requires Docker):**
```bash
supabase functions deploy refresh-tokens
```

**Set Secrets:**
- `ENCRYPTION_KEY` (required)
- `GOOGLE_CLIENT_ID` (optional)
- `GOOGLE_CLIENT_SECRET` (optional)
- `MICROSOFT_CLIENT_ID` (optional)
- `MICROSOFT_CLIENT_SECRET` (optional)

#### Step 1.2: Deploy send-reminders

**Via Supabase Dashboard:**
1. Go to: **Edge Functions** → **Create Function**
2. Name: `send-reminders`
3. Copy code from: `supabase/functions/send-reminders/index.ts`
4. Paste and click **Deploy**

**Set Secrets:**
- `ENCRYPTION_KEY` (required)

**Verify Deployments:**
```bash
supabase functions list
# Should show:
# - process-emails (ACTIVE)
# - refresh-tokens (ACTIVE)
# - send-reminders (ACTIVE)
```

---

### Phase 2: Configure Cron Jobs

#### Step 2.1: Enable pg_cron Extension

**Via Supabase Dashboard:**
1. Go to: **Database** → **Extensions**
2. Search: `pg_cron`
3. Click **Enable**

**Via SQL:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;
```

#### Step 2.2: Set Database Settings

**Required Settings:**
```sql
ALTER DATABASE postgres 
SET app.settings.supabase_url = 'https://nneyhfhdthpxmkemyenm.supabase.co';

ALTER DATABASE postgres 
SET app.settings.service_role_key = 'your-service-role-key';
```

**Get Values:**
- Supabase URL: **Settings** → **API** → **Project URL**
- Service Role Key: **Settings** → **API** → **service_role** key

#### Step 2.3: Run Cron Jobs Setup

**Via SQL Editor:**
1. Go to: **SQL Editor** in Supabase Dashboard
2. Open: `setup-cron-jobs.sql`
3. Copy entire contents
4. Paste and **Run**

**Or use migration:**
```bash
supabase db push
```

**Verify Jobs:**
```sql
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname IN ('process-emails', 'refresh-oauth-tokens', 'send-request-reminders', 'cleanup-expired-requests')
ORDER BY jobname;
```

---

### Phase 3: Verify Everything Works

#### Step 3.1: Test Email Processing

1. Go to `/dashboard/integrations`
2. Click "Process Emails Now"
3. Check toast notification for results
4. Check console for detailed logs

#### Step 3.2: Test Token Refresh

1. Go to `/dashboard/integrations`
2. Click "Refresh Tokens"
3. Check toast notification
4. Verify tokens are updated in database

#### Step 3.3: Test Token Status Check

1. Go to `/dashboard/integrations`
2. Click "Check Token Status" on any account
3. Verify status is displayed correctly

#### Step 3.4: Verify Cron Jobs

```sql
-- Check recent executions
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

---

## 📊 Deployment Status Summary

| Component | Code Status | Deployment Status | Testing Status |
|-----------|-------------|-------------------|----------------|
| process-emails | ✅ Complete | ✅ Deployed (v6) | ✅ Working |
| refresh-tokens | ✅ Complete | ⚠️ Needs Deployment | ⏳ Pending |
| send-reminders | ✅ Complete | ⚠️ Needs Deployment | ⏳ Pending |
| Token Status UI | ✅ Complete | ✅ Deployed | ✅ Working |
| Error Handling | ✅ Complete | ✅ Deployed | ✅ Working |
| Cron Jobs Setup | ✅ Complete | ⚠️ Needs Configuration | ⏳ Pending |

---

## 🔧 Troubleshooting

### Edge Function Not Found

- Verify function name matches exactly (case-sensitive)
- Check function is deployed: `supabase functions list`
- Verify secrets are set

### Token Refresh Fails

- Check `ENCRYPTION_KEY` secret is set
- Verify OAuth credentials are correct
- Check token hasn't expired (may need reconnection)

### Cron Jobs Not Running

- Verify `pg_cron` extension is enabled
- Check database settings are configured
- Verify jobs are scheduled: `SELECT * FROM cron.job`
- Check for errors: `SELECT * FROM cron.job_run_details WHERE status = 'failed'`

### Email Processing Errors

- Check email account tokens are valid
- Verify storage configuration is active
- Check Edge Function logs for detailed errors
- Use "Check Token Status" button to diagnose

---

## 📝 Next Steps After Deployment

1. **Monitor First 24 Hours:**
   - Check cron job executions
   - Verify no errors in logs
   - Confirm emails are being processed

2. **Set Up Alerts (Optional):**
   - Monitor cron job failures
   - Alert on token expiration
   - Track email processing errors

3. **Optimize Schedules (If Needed):**
   - Adjust email processing frequency
   - Change reminder timing
   - Modify token refresh schedule

---

## 📚 Documentation Files

- `REFRESH_TOKENS_DEPLOYMENT.md` - Token refresh deployment guide
- `REFRESH_TOKENS_IMPLEMENTATION.md` - Token refresh implementation details
- `SEND_REMINDERS_COMPLETE.md` - Send reminders implementation details
- `CRON_JOBS_SETUP_COMPLETE.md` - Cron jobs setup guide
- `OUTLOOK_TOKEN_FIX_IMPLEMENTED.md` - Token status UI implementation
- `setup-cron-jobs.sql` - Complete cron jobs setup script
- `verify-cron-jobs.sql` - Cron jobs verification script

---

## ✅ Quick Start Checklist

- [ ] Deploy `refresh-tokens` Edge Function
- [ ] Deploy `send-reminders` Edge Function
- [ ] Set Edge Function secrets (`ENCRYPTION_KEY`)
- [ ] Enable `pg_cron` extension
- [ ] Set database settings (supabase_url, service_role_key)
- [ ] Run `setup-cron-jobs.sql`
- [ ] Verify cron jobs are scheduled
- [ ] Test email processing manually
- [ ] Test token refresh manually
- [ ] Verify cron jobs are executing
- [ ] Monitor logs for first 24 hours

---

**Status:** Ready for Deployment

**Estimated Time:** 30-60 minutes

**Priority:** High (automation won't work without cron jobs)

