# Email Receiving Fix - Deployment Ready Checklist

## Pre-Deployment Verification

Use this checklist before deploying the email receiving fix to production.

### Code Review ✅

- [x] Edge function processes all emails (with or without attachments)
- [x] Status update logic extracted to separate function
- [x] Manual trigger API endpoint created
- [x] UI button component added
- [x] E2E tests created
- [x] No linting errors
- [x] All TypeScript types correct

### File Checklist

#### Edge Function
- [x] `supabase/functions/process-emails/index.ts` - Updated with fixes
  - [x] `updateDocumentRequestStatus()` function exists
  - [x] `processEmail()` handles emails without attachments
  - [x] `processEmailAccount()` processes all emails
  - [x] No attachment-only check

#### API Endpoints
- [x] `apps/web/app/api/process-emails/route.ts` - Manual trigger endpoint
  - [x] Admin/owner authentication check
  - [x] Error handling
  - [x] Returns proper response format

#### UI Components
- [x] `apps/web/components/process-emails-button.tsx` - Manual trigger button
  - [x] Loading state
  - [x] Toast notifications
  - [x] Error handling

#### Pages
- [x] `apps/web/app/dashboard/integrations/page.tsx` - Button integration
  - [x] Role check for admin/owner
  - [x] Conditional rendering

#### Tests
- [x] `apps/web/e2e/email-receiving.spec.ts` - E2E test suite
- [x] `test-email-receiving-fix.js` - Verification script

#### Documentation
- [x] `EMAIL_RECEIVING_FIX.md` - Fix documentation
- [x] `EMAIL_RECEIVING_DEPLOYMENT.md` - Deployment guide
- [x] `EMAIL_RECEIVING_TEST.md` - Test guide
- [x] `EMAIL_RECEIVING_COMPLETE.md` - Summary

## Deployment Steps

### Step 1: Review Changes

```bash
# Verify edge function changes
git diff supabase/functions/process-emails/index.ts

# Verify new files exist
ls -la apps/web/app/api/process-emails/route.ts
ls -la apps/web/components/process-emails-button.tsx
```

### Step 2: Test Locally

```bash
# Start dev server
cd apps/web
npm run dev

# Test manual trigger button
# Navigate to http://localhost:3000/dashboard/integrations
# Verify button appears (if admin/owner with connected accounts)
# Click button and verify toast notification

# Test API endpoint directly
curl -X POST http://localhost:3000/api/process-emails \
  -H "Cookie: your-session-cookie" \
  -H "Content-Type: application/json"
```

### Step 3: Deploy Edge Function

```bash
# Option 1: Using script
chmod +x deploy-edge-function.sh
./deploy-edge-function.sh

# Option 2: Manual deployment
supabase login
supabase link --project-ref nneyhfhdthpxmkemyenm
supabase functions deploy process-emails --no-verify-jwt
```

### Step 4: Verify Edge Function Secrets

```bash
# Check secrets are set
supabase secrets list

# Required secrets:
# - ENCRYPTION_KEY
# - SUPABASE_URL (automatically set)
# - SUPABASE_SERVICE_ROLE_KEY (automatically set)
```

### Step 5: Test Edge Function

```bash
# Option 1: Using test script
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
node test-email-receiving-fix.js

# Option 2: Manual invocation
supabase functions invoke process-emails --no-verify-jwt

# Option 3: HTTP request
curl -X POST \
  'https://nneyhfhdthpxmkemyenm.supabase.co/functions/v1/process-emails' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### Step 6: Verify Cron Jobs

Run `verify-cron-jobs.sql` in Supabase SQL Editor:

```sql
-- Check cron job exists and is active
SELECT jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'process-emails';

-- Should show:
-- jobname: process-emails
-- schedule: */5 * * * *  (every 5 minutes)
-- active: true
```

### Step 7: Test End-to-End

1. **Send Document Request**:
   - Go to `/dashboard/requests/new`
   - Create request to test email
   - Send request

2. **Reply via Email**:
   - As recipient, reply with text-only email (no attachments)
   - Subject: "Re: [original subject]"

3. **Trigger Processing**:
   - Option A: Use UI button on `/dashboard/integrations`
   - Option B: Wait for cron job (every 5 minutes)
   - Option C: Manual API call

4. **Verify Status Update**:
   - Go to `/dashboard/requests`
   - Find the request
   - Status should be "received" (green badge)
   - Refresh page - status should persist

## Post-Deployment Verification

### Edge Function Logs

Check Supabase Dashboard → Edge Functions → process-emails → Logs

**Look for**:
- ✅ "Processed email X without attachments from sender@example.com"
- ✅ "Updated request X to status: received"
- ✅ No errors related to missing attachments
- ✅ Processing completes successfully

### Database Verification

```sql
-- Check for requests with "received" status
SELECT id, subject, recipient_email, status, document_count, updated_at
FROM document_requests
WHERE status = 'received'
ORDER BY updated_at DESC
LIMIT 10;

-- Check documents linked to requests
SELECT d.id, d.original_filename, d.sender_email, dr.subject, dr.status
FROM documents d
JOIN document_requests dr ON d.document_request_id = dr.id
WHERE dr.status IN ('received', 'verifying')
ORDER BY d.created_at DESC
LIMIT 10;
```

### UI Verification

1. **Integrations Page**:
   - Navigate to `/dashboard/integrations`
   - Verify "Process Emails Now" button appears (if admin/owner)
   - Click button and verify toast notification

2. **Requests Page**:
   - Navigate to `/dashboard/requests`
   - Verify status badges display correctly
   - Verify "received" status shows green badge
   - Verify status persists after refresh

## Rollback Plan

If issues occur after deployment:

1. **Revert Edge Function**:
   ```bash
   # Via Supabase Dashboard
   # Go to Edge Functions → process-emails → Versions
   # Deploy previous version
   ```

2. **Revert Frontend** (if needed):
   ```bash
   git revert <commit-hash>
   # Or restore from backup
   ```

3. **Verify Rollback**:
   - Check edge function logs
   - Test manual trigger
   - Verify requests page still works

## Success Criteria

After deployment, verify:

- ✅ Edge function processes emails without attachments
- ✅ Status updates to "received" for text-only replies
- ✅ Dashboard shows correct status badges
- ✅ Manual trigger button works in UI
- ✅ Cron jobs run successfully
- ✅ No errors in edge function logs
- ✅ All E2E tests pass

## Monitoring

### Key Metrics to Monitor

1. **Email Processing**:
   - Number of emails processed per run
   - Success rate (processed vs errors)
   - Average processing time

2. **Status Updates**:
   - Number of requests updated to "received"
   - Number of requests with documents
   - Status transition rates

3. **Errors**:
   - Failed email processing attempts
   - OAuth token expiration errors
   - Storage upload failures

### Alerts to Set Up

- Edge function errors
- Cron job failures
- High error rate (>10% of processed emails)
- No emails processed for >1 hour (if accounts active)

## Support Resources

- **Documentation**: See `EMAIL_RECEIVING_DEPLOYMENT.md`
- **Troubleshooting**: See `EMAIL_RECEIVING_FIX.md`
- **Testing**: See `EMAIL_RECEIVING_TEST.md`
- **Verification**: Run `test-email-receiving-fix.js`

## Deployment Sign-Off

- [ ] Code reviewed and approved
- [ ] Local testing passed
- [ ] Edge function deployed
- [ ] Secrets verified
- [ ] Cron jobs verified
- [ ] End-to-end test passed
- [ ] Post-deployment verification complete
- [ ] Monitoring configured
- [ ] Team notified of deployment

---

**Ready for Production Deployment!** 🚀

