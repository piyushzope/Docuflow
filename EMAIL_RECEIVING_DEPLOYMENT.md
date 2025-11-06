# Email Receiving Fix - Deployment Guide

## Overview

This guide covers deploying the email receiving process fixes to your Supabase project. The fixes ensure that emails without attachments are properly processed and update document request status.

## What Changed

### Edge Function Updates

1. **New Function**: `updateDocumentRequestStatus()` - Handles status updates for all emails
2. **Modified**: `processEmail()` - Now processes emails with or without attachments
3. **Modified**: `processEmailAccount()` - Removed attachment-only check

### New API Endpoint

- `/api/process-emails` - Manual trigger endpoint for testing

## Deployment Options

### Option 1: Supabase CLI (Recommended)

#### Prerequisites

```bash
# Install Supabase CLI if not already installed
npm install -g supabase
# OR
brew install supabase/tap/supabase
```

#### Steps

1. **Authenticate**:
   ```bash
   supabase login
   ```

2. **Link to Project**:
   ```bash
   supabase link --project-ref nneyhfhdthpxmkemyenm
   ```

3. **Deploy Edge Function**:
   ```bash
   supabase functions deploy process-emails --no-verify-jwt
   ```

4. **Verify Secrets** (should already be set):
   ```bash
   supabase secrets list
   ```
   
   Required secrets:
   - `ENCRYPTION_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

5. **Test Deployment**:
   ```bash
   supabase functions invoke process-emails --no-verify-jwt
   ```

### Option 2: Use Deployment Script

```bash
chmod +x deploy-edge-function.sh
./deploy-edge-function.sh
```

### Option 3: Supabase Dashboard (No CLI Required)

1. **Navigate to Dashboard**:
   - Go to: https://app.supabase.com/project/nneyhfhdthpxmkemyenm
   - Click **Edge Functions** in left sidebar

2. **Edit Function**:
   - Find `process-emails` function
   - Click **Edit** or create new if doesn't exist

3. **Copy Updated Code**:
   - Open: `supabase/functions/process-emails/index.ts`
   - Copy entire file contents
   - Paste into function editor

4. **Deploy**:
   - Click **Deploy** button
   - Wait for deployment to complete

5. **Verify Secrets**:
   - Go to **Project Settings** → **Edge Functions** → **Secrets**
   - Verify these secrets exist:
     - `ENCRYPTION_KEY` = `yfb42f1aa-ec8d-4a82-8262-836afa37edab`
     - `SUPABASE_URL` = `https://nneyhfhdthpxmkemyenm.supabase.co`
     - `SUPABASE_SERVICE_ROLE_KEY` = (your service role key)

## Verification Steps

### 1. Test Edge Function Directly

```bash
# Using Supabase CLI
supabase functions invoke process-emails --no-verify-jwt

# Using HTTP (replace YOUR_SERVICE_ROLE_KEY)
curl -X POST \
  'https://nneyhfhdthpxmkemyenm.supabase.co/functions/v1/process-emails' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Email processing completed",
  "processed": 0,
  "errors": 0,
  "accounts_processed": 1,
  "duration_ms": 123,
  "account_results": [...]
}
```

### 2. Test Manual Trigger API

```bash
# Start your Next.js dev server
cd apps/web
npm run dev

# In another terminal, test the endpoint (replace COOKIE with your session cookie)
curl -X POST http://localhost:3000/api/process-emails \
  -H "Cookie: your-session-cookie" \
  -H "Content-Type: application/json"
```

**Expected Response** (if authenticated as admin):
```json
{
  "success": true,
  "message": "Email processing triggered successfully",
  "result": {
    "processed": 0,
    "errors": 0,
    "accounts_processed": 1,
    "duration_ms": 123
  }
}
```

### 3. Verify Cron Jobs

Run the verification script in Supabase SQL Editor:

```sql
-- See verify-cron-jobs.sql for full script
SELECT jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'process-emails';
```

**Expected Result**:
- Job should exist
- Schedule: `*/5 * * * *` (every 5 minutes)
- Active: `true`

### 4. Test Email Processing (Manual)

1. **Send a Document Request**:
   - Go to `/dashboard/requests/new`
   - Create request to `bullese.piyush@gmail.com`
   - Subject: "Document Request: Driver's License"
   - Send the request

2. **Reply via Email** (as recipient):
   - Reply with text-only email (no attachments)
   - Subject will be "Re: Document Request: Driver's License"

3. **Trigger Processing**:
   - Use `/api/process-emails` endpoint
   - OR wait for cron job (every 5 minutes)

4. **Verify Status Update**:
   - Go to `/dashboard/requests`
   - Find the request
   - Status should be "received" (green badge)
   - Refresh page - status should persist

## Troubleshooting

### Edge Function Fails to Deploy

**Error**: "Function not found" or deployment fails

**Solution**:
1. Check Supabase CLI is authenticated: `supabase projects list`
2. Verify project is linked: `supabase link --project-ref nneyhfhdthpxmkemyenm`
3. Try deploying via Dashboard instead

### Edge Function Deploys but Returns Errors

**Error**: "Missing ENCRYPTION_KEY" or other secret errors

**Solution**:
1. Verify secrets are set:
   ```bash
   supabase secrets list
   ```
2. Set missing secrets:
   ```bash
   supabase secrets set ENCRYPTION_KEY="your-key"
   ```
3. OR set via Dashboard: Project Settings → Edge Functions → Secrets

### Emails Not Processing

**Check Edge Function Logs**:
1. Go to Supabase Dashboard → Edge Functions → process-emails
2. Click **Logs** tab
3. Look for:
   - "Processed email X without attachments" (new log message)
   - "Updated request X to status: received"
   - Any error messages

**Common Issues**:
- Email account not active: Check `email_accounts.is_active = true`
- OAuth tokens expired: Check `email_accounts.expires_at`
- No matching requests: Verify `recipient_email` matches sender email

### Manual Trigger Returns 401/403

**Error**: "Unauthorized" or "Forbidden"

**Solution**:
1. User must be authenticated
2. User must have `admin` or `owner` role
3. Check user role: `SELECT role FROM profiles WHERE id = user_id`

### Status Not Updating

**Debug Steps**:
1. Check edge function logs for errors
2. Verify email matches request:
   ```sql
   SELECT * FROM document_requests 
   WHERE recipient_email ILIKE 'sender@example.com'
   AND status IN ('pending', 'sent');
   ```
3. Check subject matching (normalized):
   - Email subject: "Re: Document Request: Driver's License"
   - Request subject: "Document Request: Driver's License"
   - Should match after normalization

## Rollback (If Needed)

If you need to rollback to the previous version:

1. **Check Previous Version**:
   - Supabase Dashboard → Edge Functions → process-emails
   - Click **History** or **Versions**
   - Deploy previous version

2. **OR Restore from Backup**:
   - If you have the old code, redeploy it
   - Or use git to checkout previous version

## Post-Deployment Checklist

- [ ] Edge function deployed successfully
- [ ] Secrets verified (ENCRYPTION_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Edge function invokes without errors
- [ ] Manual trigger API works (if authenticated as admin)
- [ ] Cron jobs are running (check `verify-cron-jobs.sql`)
- [ ] Test email without attachments updates status
- [ ] Test email with attachments creates documents
- [ ] Dashboard displays "received" status correctly
- [ ] Status persists after page refresh
- [ ] Edge function logs show processing messages

## Success Indicators

After deployment, you should see:

✅ Edge function processes emails without attachments  
✅ Status updates to "received" for text-only replies  
✅ Log messages: "Processed email X without attachments"  
✅ Log messages: "Updated request X to status: received"  
✅ Dashboard shows green "received" badge  
✅ Manual trigger endpoint works  
✅ Cron jobs execute successfully  

## Related Documentation

- `EMAIL_RECEIVING_FIX.md` - Detailed fix documentation
- `EMAIL_RECEIVING_TEST.md` - Test guide
- `verify-cron-jobs.sql` - Cron job verification
- `IMPLEMENTATION_COMPLETE.md` - Implementation summary
- `DEPLOYMENT_GUIDE.md` - General deployment guide

## Support

If you encounter issues:

1. Check edge function logs in Supabase Dashboard
2. Run `verify-cron-jobs.sql` to check cron status
3. Test edge function manually: `supabase functions invoke process-emails --no-verify-jwt`
4. Review `EMAIL_RECEIVING_FIX.md` for troubleshooting tips

