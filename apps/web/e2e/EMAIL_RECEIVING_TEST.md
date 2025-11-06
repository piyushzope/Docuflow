# Email Receiving E2E Tests

## Overview

This test suite verifies that the email receiving process works correctly after the fixes. It tests:

1. **Status Updates**: Emails without attachments update request status to "received"
2. **Document Creation**: Emails with attachments create documents and update status
3. **Dashboard Display**: Status badges display correctly with proper colors
4. **Persistence**: Status changes persist after page refresh

## Test File

### `email-receiving.spec.ts`

Comprehensive test suite covering:
- Status badge display and colors
- Email processing trigger
- Status updates for emails without attachments
- Document count display for emails with attachments
- Status persistence after refresh
- Error handling

## Prerequisites

1. **Development server** running on `http://localhost:3000`
2. **Test user authenticated** and logged in (admin/owner for manual trigger)
3. **Email account connected** (Gmail or Outlook)
4. **At least one document request** with status "sent" or "pending"
5. **Test scenario**: A recipient has replied to a document request

## Running the Tests

### Run All Email Receiving Tests

```bash
cd apps/web
npx playwright test email-receiving.spec.ts
```

### Run Specific Test

```bash
npx playwright test email-receiving.spec.ts -g "should display request status badges"
```

### Run with UI Mode (Recommended for Debugging)

```bash
npx playwright test email-receiving.spec.ts --ui
```

### Run in Headed Mode

```bash
npx playwright test email-receiving.spec.ts --headed
```

## Test Scenarios

### Scenario 1: Status Badge Display

**Test**: `should display request status badges correctly`

**Steps**:
1. Navigate to `/dashboard/requests`
2. Verify status badges are visible
3. Check badges have appropriate styling

**Expected Result**:
- Status badges are displayed
- Badges have color classes (bg-*-100 text-*-800)

### Scenario 2: Received Status Badge

**Test**: `should show "received" status badge with correct styling`

**Steps**:
1. Navigate to requests page
2. Find a request with "received" status
3. Verify badge has green styling

**Expected Result**:
- Green badge (bg-green-100 text-green-800)
- Text says "received"

### Scenario 3: Manual Email Processing Trigger

**Test**: `should trigger manual email processing`

**Steps**:
1. Call `/api/process-emails` endpoint
2. Check response status
3. Verify response structure

**Expected Result**:
- Endpoint responds (200 if admin, 401/403 if not)
- Response includes `success`, `result` with `processed`, `errors`

### Scenario 4: Status Update (No Attachments)

**Test**: `should update request status after email is received (no attachments)`

**Steps**:
1. Find a request with "sent" status
2. Trigger email processing (after recipient has replied)
3. Refresh page
4. Verify status changed to "received"

**Expected Result**:
- Status updates from "sent" to "received"
- Badge color changes from blue to green

### Scenario 5: Document Count Display

**Test**: `should display document count when documents are received`

**Steps**:
1. After email with attachments is processed
2. Navigate to requests page
3. Find request with "received" or "verifying" status
4. Verify request card displays correctly

**Expected Result**:
- Request status is "received" or "verifying"
- Document is linked to request

### Scenario 6: Status Persistence

**Test**: `should persist status after page refresh`

**Steps**:
1. Note a request's status
2. Refresh page
3. Verify status remains the same

**Expected Result**:
- Status persists after refresh
- Badge color remains correct

### Scenario 7: Status Badge Colors

**Test**: `should show correct status badge colors`

**Steps**:
1. Check pending badges (should be yellow)
2. Check sent badges (should be blue)
3. Check received badges (should be green)

**Expected Result**:
- Pending: yellow (bg-yellow-100 text-yellow-800)
- Sent: blue (bg-blue-100 text-blue-800)
- Received: green (bg-green-100 text-green-800)

## Manual Testing Guide

### Test 1: Email Without Attachments

1. **Send a Document Request**:
   - Create request to `test@example.com`
   - Subject: "Document Request: Test"
   - Send the request (status should be "sent")

2. **Reply via Email** (as recipient):
   - Reply to the email with text only (no attachments)
   - Subject will be "Re: Document Request: Test"

3. **Trigger Email Processing**:
   ```bash
   # Via API (if authenticated as admin)
   curl -X POST http://localhost:3000/api/process-emails \
     -H "Cookie: your-session-cookie" \
     -H "Content-Type: application/json"
   ```
   OR via Supabase Dashboard → Edge Functions → process-emails → Invoke

4. **Verify**:
   - Go to `/dashboard/requests`
   - Request status should be "received"
   - Badge should be green
   - Status persists after refresh

### Test 2: Email With Attachments

1. **Send a Document Request**:
   - Create request to `test@example.com`
   - Subject: "Document Request: Driver's License"

2. **Reply with Attachment**:
   - Reply with an attachment (e.g., PDF, image)
   - Subject: "Re: Document Request: Driver's License"

3. **Trigger Email Processing**:
   - Use manual trigger or wait for cron job

4. **Verify**:
   - Request status: "received" or "verifying"
   - Document created in database
   - Document linked to request
   - Document uploaded to storage (OneDrive/Google Drive)
   - Dashboard shows updated status

### Test 3: Dashboard Display

1. **Navigate to Requests Page**:
   - `/dashboard/requests`

2. **Check Status Badges**:
   - Pending: yellow badge
   - Sent: blue badge
   - Received: green badge

3. **Verify Persistence**:
   - Refresh page
   - Status badges remain correct

## Key Assertions

### Critical Assertions (Must Pass)

1. ✅ Status badges display correctly
2. ✅ "Received" status shows green badge
3. ✅ Manual trigger endpoint works (if admin)
4. ✅ Status updates persist after refresh
5. ✅ Badge colors match status (pending=yellow, sent=blue, received=green)

### Integration Assertions

- Email processing updates request status correctly
- Errors are handled gracefully
- Dashboard shows real-time status updates

## Debugging Failed Tests

### Common Issues

1. **Test times out waiting for status update**
   - Check email processing actually ran
   - Verify recipient replied to request
   - Check edge function logs

2. **Status badge not found**
   - Check CSS classes match (may have changed)
   - Verify page structure hasn't changed
   - Check if badge selector is correct

3. **Manual trigger returns 401/403**
   - User must be authenticated as admin/owner
   - Check user role in `profiles` table

4. **Status doesn't update**
   - Verify email processing edge function ran
   - Check edge function logs for errors
   - Verify request recipient_email matches sender email
   - Check subject matching logic

### Debug Commands

```bash
# Run with debug logging
DEBUG=pw:api npx playwright test email-receiving.spec.ts

# Run with trace
npx playwright test email-receiving.spec.ts --trace on

# View trace after test
npx playwright show-trace trace.zip

# Run specific test with screenshot
npx playwright test email-receiving.spec.ts -g "should show received status" --screenshot=only-on-failure
```

## Related Code

### Frontend Components
- `apps/web/app/dashboard/requests/page.tsx` - Requests list display
- `apps/web/components/request-action-buttons.tsx` - Action buttons

### API Endpoints
- `apps/web/app/api/process-emails/route.ts` - Manual trigger endpoint

### Edge Functions
- `supabase/functions/process-emails/index.ts` - Email processing logic
  - `updateDocumentRequestStatus()` - Status update function
  - `processEmail()` - Email processing function

### Database
- `document_requests.status` - Request status ('pending' | 'sent' | 'received' | ...)
- `document_requests.document_count` - Number of documents received
- `documents.document_request_id` - Link between documents and requests

## Test Coverage

| Scenario | Test Name | Status |
|----------|-----------|--------|
| Status badge display | `should display request status badges correctly` | ✅ |
| Received badge styling | `should show "received" status badge with correct styling` | ✅ |
| Manual trigger | `should trigger manual email processing` | ✅ |
| Status update (no attachments) | `should update request status after email is received (no attachments)` | ✅ |
| Document count | `should display document count when documents are received` | ✅ |
| Status persistence | `should persist status after page refresh` | ✅ |
| Badge colors | `should show correct status badge colors` | ✅ |
| Integration test | `should process emails and update requests` | ✅ |
| Error handling | `should handle errors gracefully` | ✅ |

## Next Steps

1. **Run tests** to verify fixes work correctly
2. **Perform manual testing** with real email replies
3. **Monitor edge function logs** for processing results
4. **Verify cron jobs** are running (see `verify-cron-jobs.sql`)
5. **Check dashboard** displays status correctly

