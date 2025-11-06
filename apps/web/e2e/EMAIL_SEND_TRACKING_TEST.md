# Email Send Tracking E2E Tests

## Overview

This test suite verifies that email sending is properly tracked and displayed on the document requests page. After a user clicks "Send" on a document request, the following should be tracked and visible:

1. **Status Badge Update**: Changes from "Pending" to "Sent"
2. **Sent Timestamp**: "Sent: [timestamp]" appears
3. **Send Button**: Disappears (only shown for pending requests)
4. **Persistence**: Status and timestamp persist after page reload
5. **Visual Feedback**: Correct badge colors and immediate updates

## Problem Statement

Users report being unable to track when emails were sent on the document requests page. This suggests:
- Status badges don't update after sending
- `sent_at` timestamp doesn't appear
- Page doesn't refresh to show updated state
- Status changes aren't persisted

## Test File

### `email-send-tracking.spec.ts`

Comprehensive test suite with 8 test scenarios covering:
- Status badge display and updates
- Sent timestamp appearance
- Send button visibility
- Status persistence
- Immediate UI updates
- Correct badge colors
- Multiple request tracking

## Running the Tests

### Prerequisites

1. Development server running on `http://localhost:3000`
2. Test user authenticated and logged in
3. At least one pending document request available
4. Email account connected (for actual sending)

### Run All Tests

```bash
cd apps/web
npx playwright test email-send-tracking.spec.ts
```

### Run Specific Test

```bash
npx playwright test email-send-tracking.spec.ts -g "should update status badge"
```

### Run with UI Mode

```bash
npx playwright test email-send-tracking.spec.ts --ui
```

### Run in Headed Mode

```bash
npx playwright test email-send-tracking.spec.ts --headed
```

## Test Scenarios

### Scenario 1: Pending Status Display

**Test:** `should display pending status badge before sending`

**Steps:**
1. Navigate to `/dashboard/requests`
2. Find a request with "Pending" status
3. Verify status badge is visible
4. Verify "Sent:" timestamp is NOT shown

**Expected Result:**
- Pending badge (yellow) is visible
- No "Sent:" timestamp displayed

### Scenario 2: Status Badge Update

**Test:** `should update status badge to "sent" after sending email`

**Steps:**
1. Find a pending request with Send button
2. Note initial status (should be "pending")
3. Click Send button
4. Wait for API response and page refresh
5. Verify status badge now shows "sent"

**Expected Result:**
- Status badge changes from "pending" to "sent"
- Badge color changes from yellow to blue
- Update happens within 2-3 seconds

### Scenario 3: Sent Timestamp Display

**Test:** `should display "Sent: [timestamp]" after email is sent`

**Steps:**
1. Find a pending request
2. Verify "Sent:" is NOT visible before sending
3. Click Send button
4. Wait for response and page refresh
5. Verify "Sent: [timestamp]" appears
6. Verify timestamp format is correct (contains date)

**Expected Result:**
- "Sent: [timestamp]" appears after sending
- Timestamp contains readable date format
- Timestamp persists after page refresh

### Scenario 4: Send Button Visibility

**Test:** `should hide Send button after status changes to sent`

**Steps:**
1. Find a pending request with Send button
2. Verify Send button is visible
3. Click Send
4. Wait for status update
5. Verify Send button is no longer visible

**Expected Result:**
- Send button only appears for "pending" status
- Send button disappears after status changes to "sent"
- Only "Remind", "Edit", "Delete" buttons remain visible

### Scenario 5: Status Persistence

**Test:** `should persist sent status and timestamp after page reload`

**Steps:**
1. Send a request (or find an existing sent request)
2. Note the "Sent:" timestamp
3. Reload the page
4. Verify status is still "sent"
5. Verify "Sent:" timestamp is still displayed
6. Verify timestamp matches previous value

**Expected Result:**
- Status remains "sent" after reload
- "Sent:" timestamp persists
- Timestamp value matches (same date)

### Scenario 6: Immediate UI Update

**Test:** `should update request card with sent status immediately after sending`

**Steps:**
1. Find a pending request
2. Note initial status in request card
3. Click Send
4. Wait for response
5. Verify request card shows "sent" status
6. Verify "Sent:" timestamp appears in card

**Expected Result:**
- Status updates in the same request card
- Update happens without full page reload
- "Sent:" timestamp appears in card metadata

### Scenario 7: Status Badge Colors

**Test:** `should show correct status badge color for sent status`

**Steps:**
1. Find or create a sent request
2. Locate the status badge
3. Verify badge has blue color classes
4. Verify it's not yellow (pending) or other colors

**Expected Result:**
- Sent status uses blue badge (`bg-blue-100 text-blue-800`)
- Pending uses yellow badge (`bg-yellow-100 text-yellow-800`)
- Colors are consistent and visually distinct

### Scenario 8: Multiple Request Tracking

**Test:** `should track multiple sent requests correctly`

**Steps:**
1. Send multiple pending requests (up to 2)
2. Wait for all updates to complete
3. Verify all sent requests show "sent" status
4. Verify all have "Sent:" timestamps
5. Verify counts match

**Expected Result:**
- Multiple requests can be sent sequentially
- All sent requests show correct status
- All have timestamps
- No conflicts or missed updates

## Key Assertions

### Critical Assertions (Must Pass)

1. ✅ Status badge updates from "pending" to "sent" after sending
2. ✅ "Sent: [timestamp]" appears after email is sent
3. ✅ Send button disappears after status changes to "sent"
4. ✅ Status and timestamp persist after page reload
5. ✅ Status updates immediately after sending (within 2-3 seconds)

### Visual Assertions

- Status badge color changes (yellow → blue)
- Timestamp format is readable
- Badge text is capitalized correctly
- All updates happen in same request card

## Potential Issues & Fixes

### Issue 1: Status Not Updating

**Symptoms:**
- Status badge remains "pending" after sending
- No visual feedback that email was sent

**Possible Causes:**
- `router.refresh()` not working properly
- Server-side data not updated
- Client-side cache not cleared
- API response not successful

**Fix:**
```typescript
// In request-action-buttons.tsx
// After successful send:
router.refresh();
// Also try:
window.location.reload(); // Fallback if router.refresh() fails
```

### Issue 2: Timestamp Not Appearing

**Symptoms:**
- Status changes to "sent" but no "Sent:" timestamp
- `sent_at` field not populated in database

**Possible Causes:**
- API endpoint not setting `sent_at`
- Database update failed
- UI not reading `sent_at` field

**Fix:**
```typescript
// Verify API endpoint sets sent_at:
await supabase
  .from('document_requests')
  .update({
    status: 'sent',
    sent_at: new Date().toISOString(), // Ensure this is set
  })
  .eq('id', docRequest.id);
```

### Issue 3: Page Not Refreshing

**Symptoms:**
- Changes happen in database but UI doesn't update
- Must manually refresh page to see changes

**Possible Causes:**
- `router.refresh()` not working in Next.js 15
- Server component not re-fetching data
- Client-side cache

**Fix:**
```typescript
// Force re-fetch on server component
export const dynamic = 'force-dynamic'; // Add to page.tsx
export const revalidate = 0; // Disable caching
```

### Issue 4: Status Update Delayed

**Symptoms:**
- Status updates but takes too long (>5 seconds)
- User sees stale data briefly

**Possible Causes:**
- Network latency
- Database query slow
- No optimistic updates

**Fix:**
```typescript
// Add optimistic update in client component
const [localStatus, setLocalStatus] = useState(status);

// Update immediately on send click
setLocalStatus('sent');

// Then sync with server after API call
```

## Debugging Failed Tests

### Common Issues

1. **Test times out waiting for status update**
   - Check API endpoint is responding
   - Verify database update is successful
   - Check network tab for API calls
   - Increase timeout if needed

2. **Status badge not found**
   - Check CSS classes match (may have changed)
   - Verify page structure hasn't changed
   - Check if badge selector is correct

3. **Timestamp not appearing**
   - Verify `sent_at` is set in database
   - Check `formatDate()` function works correctly
   - Verify conditional rendering (`{request.sent_at && ...}`)

4. **Send button still visible**
   - Check status update is successful
   - Verify conditional logic in `RequestActionButtons`
   - Check `router.refresh()` is called

### Debug Commands

```bash
# Run with debug logging
DEBUG=pw:api npx playwright test email-send-tracking.spec.ts

# Run with trace
npx playwright test email-send-tracking.spec.ts --trace on

# View trace after test
npx playwright show-trace trace.zip

# Run specific test with screenshot
npx playwright test email-send-tracking.spec.ts -g "should update status badge" --screenshot=only-on-failure
```

## Related Code

### Client-Side Components
- `apps/web/components/request-action-buttons.tsx` - Send button handler
- `apps/web/app/dashboard/requests/page.tsx` - Requests list display
- `apps/web/lib/utils.ts` - `formatDate()` function

### Server-Side API
- `apps/web/app/api/send-request/route.ts` - Send request endpoint
- Updates `status` to 'sent' and sets `sent_at` timestamp

### Database Schema
- `document_requests.status` - Request status ('pending' | 'sent' | ...)
- `document_requests.sent_at` - Timestamp when email was sent
- `document_requests.status_changed_by` - User who sent it

## Test Coverage

| Scenario | Test Name | Status |
|----------|-----------|--------|
| Pending status display | `should display pending status badge before sending` | ✅ |
| Status badge update | `should update status badge to "sent" after sending email` | ✅ |
| Sent timestamp display | `should display "Sent: [timestamp]" after email is sent` | ✅ |
| Send button visibility | `should hide Send button after status changes to sent` | ✅ |
| Status persistence | `should persist sent status and timestamp after page reload` | ✅ |
| Immediate UI update | `should update request card with sent status immediately after sending` | ✅ |
| Badge colors | `should show correct status badge color for sent status` | ✅ |
| Multiple requests | `should track multiple sent requests correctly` | ✅ |

## Next Steps

1. **Run tests to identify issues**
   ```bash
   npx playwright test email-send-tracking.spec.ts --headed
   ```

2. **Fix any failing tests**
   - Identify which assertions fail
   - Check related code components
   - Apply fixes based on "Potential Issues" section

3. **Add optimistic updates**
   - Update UI immediately on send click
   - Sync with server response
   - Handle errors gracefully

4. **Improve refresh mechanism**
   - Ensure `router.refresh()` works in Next.js 15
   - Add fallback to `window.location.reload()`
   - Consider using `revalidatePath()` for better cache control

5. **Add loading states**
   - Show loading indicator while sending
   - Disable Send button during operation
   - Provide clear feedback on success/failure

