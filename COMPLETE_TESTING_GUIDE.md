# Complete Testing Guide - All Implementations

## Overview

This guide provides comprehensive testing instructions for all recently implemented features:
1. Email Processing (with status updates)
2. Token Refresh System
3. Send Reminders System
4. Token Status UI
5. Error Handling Improvements

---

## Prerequisites

- Supabase project configured
- Edge Functions deployed (or ready to deploy)
- Email accounts connected (Gmail/Outlook)
- Admin/Owner access to dashboard
- Test document requests created

---

## 1. Testing Email Processing

### Test 1.1: Manual Trigger via UI

**Steps:**
1. Navigate to `/dashboard/integrations`
2. Verify "Process Emails Now" button is visible (admin/owner only)
3. Click the button
4. Check toast notification for results
5. Check browser console for detailed logs

**Expected Results:**
- Button shows loading state while processing
- Toast shows success message with counts
- Console shows detailed response with account results
- If errors occur, detailed error messages appear

**Script:**
```bash
./test-process-emails.sh
```

### Test 1.2: Email Processing with Status Updates

**Setup:**
1. Create a document request with recipient email
2. Send the request (status should be "sent")
3. Reply to the email (as recipient) with text-only email

**Steps:**
1. Click "Process Emails Now"
2. Check document request status updated to "received"
3. Verify status badge shows "Received" in dashboard

**Verify in Database:**
```sql
SELECT id, status, document_count, updated_at
FROM document_requests
WHERE recipient_email = 'test@example.com'
ORDER BY updated_at DESC
LIMIT 1;
```

### Test 1.3: Error Handling

**Test Token Expiration:**
1. Use an account with expired token
2. Click "Process Emails Now"
3. Verify error message shows token expiration
4. Check console for detailed error

**Expected:**
- Error message: "Token may be expired"
- Account listed in error details
- Suggestion to refresh tokens

---

## 2. Testing Token Refresh

### Test 2.1: Manual Trigger via UI

**Steps:**
1. Navigate to `/dashboard/integrations`
2. Click "Refresh Tokens" button
3. Check toast notification
4. Check console for detailed results

**Expected Results:**
- Success message if tokens refreshed
- Shows count of tokens refreshed
- Errors displayed if any occur

**Script:**
```bash
./test-refresh-tokens.sh
```

### Test 2.2: Verify Tokens Updated

**Check Database:**
```sql
SELECT 
  email,
  provider,
  expires_at,
  updated_at,
  CASE 
    WHEN expires_at IS NULL THEN 'No expiration'
    WHEN expires_at < NOW() THEN 'Expired'
    WHEN expires_at < NOW() + INTERVAL '1 hour' THEN 'Expiring soon'
    ELSE 'Valid'
  END as status
FROM email_accounts
WHERE is_active = true
ORDER BY updated_at DESC;
```

**Verify:**
- `updated_at` timestamp should be recent
- `expires_at` should be in the future
- Status should be "Valid" or "Expiring soon"

### Test 2.3: Edge Function Direct Test

```bash
curl -X POST \
  'https://nneyhfhdthpxmkemyenm.supabase.co/functions/v1/refresh-tokens' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Token refresh completed",
  "refreshed": 1,
  "errors": 0,
  "results": [...],
  "duration_ms": 1234
}
```

---

## 3. Testing Token Status UI

### Test 3.1: Check Token Status

**Steps:**
1. Navigate to `/dashboard/integrations`
2. Find a connected email account
3. Click "Check Token Status" button
4. Verify status is displayed

**Expected:**
- Token status badge (Valid/Expiring/Expired)
- Last sync time
- Any errors displayed in red box
- "Reconnect Account" button if error detected

### Test 3.2: Token Error Display

**Setup:**
1. Use account with expired/malformed token
2. Click "Check Token Status"

**Expected:**
- Red error box appears
- Error message shows token issue
- "Reconnect Account" button visible
- Console shows detailed error

### Test 3.3: Reconnect Flow

**Steps:**
1. Disconnect account with token error
2. Click "Reconnect" button
3. Complete OAuth flow
4. Verify token is now valid

**Verify:**
- Account status shows "Active"
- Token status shows "Valid"
- "Check Token Status" shows no errors

---

## 4. Testing Send Reminders

### Test 4.1: Manual Trigger

**Script:**
```bash
./test-send-reminders.sh
```

**Direct API Test:**
```bash
curl -X POST \
  'https://nneyhfhdthpxmkemyenm.supabase.co/functions/v1/send-reminders' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Reminder sending completed",
  "reminders_sent": 0,
  "errors": 0,
  "requests_processed": 0,
  "request_results": [],
  "duration_ms": 123
}
```

### Test 4.2: Create Test Request Needing Reminder

**Setup:**
1. Create document request with:
   - `reminder_months` = 1
   - `due_date` = 1 month from now
   - Status = "pending" or "sent"

**Steps:**
1. Trigger send-reminders function
2. Verify reminder email sent
3. Check `last_reminder_sent` updated

**Verify in Database:**
```sql
SELECT 
  id,
  recipient_email,
  subject,
  due_date,
  reminder_months,
  last_reminder_sent,
  status
FROM document_requests
WHERE reminder_months > 0
  AND due_date IS NOT NULL
ORDER BY due_date ASC;
```

### Test 4.3: Verify Reminder Email Sent

**Check Activity Logs:**
```sql
SELECT 
  action,
  resource_type,
  resource_id,
  details,
  created_at
FROM activity_logs
WHERE action = 'reminder_sent'
ORDER BY created_at DESC
LIMIT 10;
```

**Verify Email:**
- Check recipient's inbox for reminder email
- Subject should be: "Reminder: [original subject]"
- Body should include original request message

---

## 5. Testing Cron Jobs

### Test 5.1: Verify Jobs Are Scheduled

**SQL Query:**
```sql
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
```

**Expected:**
- All 4 jobs should exist
- `active` should be `true`
- Schedules should match:
  - `process-emails`: `*/5 * * * *` (every 5 minutes)
  - `refresh-oauth-tokens`: `0 * * * *` (every hour)
  - `send-request-reminders`: `0 9 * * *` (daily 9 AM)
  - `cleanup-expired-requests`: `0 0 * * *` (daily midnight)

### Test 5.2: Check Recent Executions

**SQL Query:**
```sql
SELECT 
  j.jobname,
  jrd.start_time,
  jrd.end_time,
  jrd.status,
  jrd.return_message,
  EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time)) AS duration_seconds
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname IN (
  'process-emails',
  'refresh-oauth-tokens',
  'send-request-reminders'
)
ORDER BY jrd.start_time DESC
LIMIT 20;
```

**Verify:**
- Jobs are executing (recent `start_time`)
- Status is "succeeded" (not "failed")
- No errors in `return_message`

### Test 5.3: Check for Failures

**SQL Query:**
```sql
SELECT 
  j.jobname,
  jrd.start_time,
  jrd.status,
  jrd.return_message
FROM cron.job_run_details jrd
JOIN cron.job j ON jrd.jobid = j.jobid
WHERE jrd.status = 'failed'
  AND jrd.start_time > NOW() - INTERVAL '24 hours'
ORDER BY jrd.start_time DESC;
```

**Expected:**
- No rows returned (no failures)
- Or if failures exist, investigate `return_message`

---

## 6. End-to-End Testing Scenarios

### Scenario 6.1: Complete Email Flow

**Steps:**
1. Create document request
2. Send request (status → "sent")
3. Recipient replies with attachment
4. Wait for cron job or trigger manually
5. Verify:
   - Document stored in storage
   - Request status → "received" → "verifying"
   - Document linked to request
   - Status badge updated in UI

### Scenario 6.2: Token Lifecycle

**Steps:**
1. Connect email account (fresh tokens)
2. Check token status (should be "Valid")
3. Wait for token to near expiration
4. Trigger token refresh manually
5. Verify:
   - Token refreshed successfully
   - New expiration date set
   - Status still shows "Valid"

### Scenario 6.3: Reminder Flow

**Steps:**
1. Create request with `reminder_months = 1`
2. Set `due_date` to 1 month from now
3. Wait or manually trigger send-reminders
4. Verify:
   - Reminder email sent
   - `last_reminder_sent` updated
   - Activity log created

---

## 7. Error Scenarios

### Test 7.1: Expired Token Handling

**Setup:**
- Account with expired token

**Verify:**
- Error message shows token expiration
- Suggestion to refresh or reconnect
- Console shows detailed error

### Test 7.2: Missing Email Account

**Setup:**
- Request without email account configured

**Verify:**
- Error message indicates missing account
- Suggestion to connect account

### Test 7.3: Missing Storage Configuration

**Setup:**
- No default storage configured

**Verify:**
- Error logged but processing continues
- Status still updates (if applicable)

---

## 8. Performance Testing

### Test 8.1: Processing Speed

**Measure:**
- Time to process 10 emails
- Time to refresh 5 tokens
- Time to send 10 reminders

**Expected:**
- Email processing: < 30 seconds for 10 emails
- Token refresh: < 5 seconds per token
- Reminder sending: < 2 seconds per reminder

### Test 8.2: Concurrent Requests

**Test:**
- Multiple users triggering email processing simultaneously
- Multiple token refresh requests
- Verify no race conditions

---

## 9. Integration Testing Checklist

- [ ] Email processing works with Gmail
- [ ] Email processing works with Outlook
- [ ] Token refresh works for Gmail
- [ ] Token refresh works for Outlook
- [ ] Reminders sent via Gmail
- [ ] Reminders sent via Outlook
- [ ] Status updates work correctly
- [ ] Error handling displays properly
- [ ] Cron jobs execute on schedule
- [ ] Manual triggers work via UI
- [ ] Manual triggers work via API

---

## 10. Troubleshooting

### Common Issues

**Issue: Function not found (404)**
- Solution: Deploy Edge Function via Dashboard
- Verify function name matches exactly

**Issue: Token refresh fails**
- Check `ENCRYPTION_KEY` secret is set
- Verify OAuth credentials are correct
- Check token hasn't expired completely

**Issue: Cron jobs not running**
- Verify `pg_cron` extension is enabled
- Check database settings are configured
- Verify jobs are scheduled and active

**Issue: No emails processed**
- Check email accounts are active
- Verify tokens are valid
- Check last_sync_at timestamp
- Review Edge Function logs

---

## Test Scripts

All test scripts are in the project root:

1. `test-process-emails.sh` - Test email processing
2. `test-refresh-tokens.sh` - Test token refresh
3. `test-send-reminders.sh` - Test reminder sending

**Usage:**
```bash
# Make executable (if not already)
chmod +x test-*.sh

# Run tests
./test-process-emails.sh
./test-refresh-tokens.sh
./test-send-reminders.sh
```

---

## Quick Reference

### API Endpoints

- `POST /api/process-emails` - Manual email processing
- `POST /api/refresh-tokens` - Manual token refresh
- `POST /api/email/check-status` - Check token status

### Edge Functions

- `process-emails` - Processes emails (every 5 min)
- `refresh-tokens` - Refreshes tokens (every hour)
- `send-reminders` - Sends reminders (daily 9 AM)

### UI Components

- `/dashboard/integrations` - Main integrations page
- "Process Emails Now" button
- "Refresh Tokens" button
- "Check Token Status" button

---

**Status:** Ready for Testing

