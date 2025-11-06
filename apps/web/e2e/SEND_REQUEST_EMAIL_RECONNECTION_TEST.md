# Send Request Email Account Reconnection E2E Tests

## Overview

This test suite covers the scenario where a user attempts to send a document request when their email account is disconnected or has expired tokens. The tests verify that:

1. Users are **not** incorrectly logged out when email account errors occur
2. Session expiration errors do **not** appear when the actual issue is email account connectivity
3. Users can successfully reconnect their email account and send requests
4. The application distinguishes between session errors and email account errors

## Problem Statement

Previously, when clicking "Send" on a document request with a disconnected or expired email account, users were seeing "Your session has expired. Please log in again" errors and being logged out. This was a false positive - the actual issue was the email account state, not the user's session.

After reconnecting the email account, sending worked without requiring a logout/login cycle, confirming that the session was valid all along.

## Test Files

### 1. `send-request-email-reconnection.spec.ts`

Comprehensive test suite covering:
- Handling send failures when email account is disconnected
- Navigating to integrations when email account error occurs
- Successfully sending after reconnecting email account
- Verifying user remains logged in during email account errors
- Distinguishing between session expiration and email account errors

### 2. Enhanced `document-request.spec.ts`

Added tests for:
- Send button click without logging out
- Appropriate error messages for email account issues (not session errors)

## Running the Tests

### Prerequisites

1. Development server running on `http://localhost:3000`
2. Test user authenticated and logged in
3. Test data: At least one pending document request
4. Email account in disconnected/expired state (for some tests)

### Run All Tests

```bash
cd apps/web
npx playwright test send-request-email-reconnection.spec.ts
```

### Run Specific Test

```bash
npx playwright test send-request-email-reconnection.spec.ts -g "should not log out user"
```

### Run with UI Mode

```bash
npx playwright test send-request-email-reconnection.spec.ts --ui
```

### Run in Headed Mode

```bash
npx playwright test send-request-email-reconnection.spec.ts --headed
```

## Test Scenarios

### Scenario 1: Send with Disconnected Email Account

**Test:** `should handle send failure when email account is disconnected`

**Steps:**
1. Navigate to `/dashboard/requests`
2. Click "Send" on a pending request
3. Verify error message appears
4. Verify user is **still** on `/dashboard/requests` (not redirected to login)
5. Check that error is about email account, not session expiration

**Expected Result:**
- Error toast appears mentioning email account
- User remains logged in
- No session expiration error

### Scenario 2: Navigate to Integrations

**Test:** `should navigate to integrations when email account error occurs`

**Steps:**
1. Navigate to `/dashboard/requests`
2. Click "Send" on a pending request
3. Verify error suggests connecting email account
4. Navigate to `/dashboard/integrations`
5. Verify connect buttons are visible

**Expected Result:**
- Can navigate to integrations page
- Connect buttons are visible
- User remains authenticated

### Scenario 3: Reconnect and Send Successfully

**Test:** `should successfully send after reconnecting email account`

**Steps:**
1. Navigate to `/dashboard/requests`
2. Navigate to `/dashboard/integrations`
3. Reconnect email account (OAuth flow - would be mocked in full test)
4. Return to `/dashboard/requests`
5. Click "Send" again
6. Verify no session expiration error
7. Verify either success or email-specific error (not session error)

**Expected Result:**
- After reconnecting, send works or shows appropriate email error
- No session expiration errors
- User remains logged in throughout

### Scenario 4: User Remains Logged In

**Test:** `should not log out user when email account error occurs`

**Steps:**
1. Navigate to `/dashboard/requests`
2. Click "Send" on a pending request
3. Wait for response
4. Verify URL is still `/dashboard/*` (not `/login`)
5. Verify can navigate to other dashboard pages
6. Verify page content is still accessible

**Expected Result:**
- User remains authenticated
- Can navigate dashboard freely
- No redirect to login page

### Scenario 5: Error Message Distinction

**Test:** `should distinguish between session expiration and email account errors`

**Steps:**
1. Navigate to `/dashboard/requests`
2. Click "Send" on a pending request
3. Check error toast content
4. Verify error mentions email account (not session)
5. Verify user remains on dashboard

**Expected Result:**
- Error message is specific to email account issue
- No generic session expiration message
- User stays authenticated

## Key Assertions

### Critical Assertions (Must Pass)

1. ✅ User remains on `/dashboard/*` after send attempt
2. ✅ User is NOT redirected to `/login`
3. ✅ Error messages mention email account, not session expiration
4. ✅ User can navigate to other dashboard pages after error
5. ✅ After reconnecting email, sending works or shows email-specific error

### Nice-to-Have Assertions

- Error toast appears with appropriate message
- Connect button visible on integrations page
- Success toast appears when send succeeds after reconnect

## Test Limitations

### Current Limitations

1. **OAuth Mocking**: Full OAuth flow is not mocked - tests skip actual reconnection
2. **Database Setup**: Tests rely on existing test data rather than setup/teardown
3. **Email Sending**: Actual email sending is not verified (would require email service mocking)

### Future Enhancements

1. Add database fixtures for test data setup/cleanup
2. Mock OAuth flows for full integration testing
3. Add email service mocking to verify emails are sent
4. Add test utilities for manipulating email account state
5. Add parallel test execution support

## Integration with CI/CD

These tests should run in CI/CD pipeline:

```yaml
# Example GitHub Actions workflow step
- name: Run E2E Tests
  run: |
    cd apps/web
    npx playwright test send-request-email-reconnection.spec.ts
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
```

## Debugging Failed Tests

### Common Issues

1. **Test times out waiting for Send button**
   - Ensure test data includes pending requests
   - Check that requests page loads correctly

2. **User gets logged out unexpectedly**
   - Check authentication cookies are set
   - Verify session is valid before test starts
   - Check for middleware redirects

3. **Error messages don't match expectations**
   - Check toast component implementation
   - Verify error message format in API responses
   - Check client-side error handling logic

### Debug Commands

```bash
# Run with debug logging
DEBUG=pw:api npx playwright test send-request-email-reconnection.spec.ts

# Run with trace
npx playwright test send-request-email-reconnection.spec.ts --trace on

# View trace after test
npx playwright show-trace trace.zip
```

## Related Code

### Client-Side
- `apps/web/components/request-action-buttons.tsx` - Send button handler
- `apps/web/app/dashboard/integrations/page.tsx` - Email account reconnection UI

### Server-Side
- `apps/web/app/api/send-request/route.ts` - Send request API endpoint
- `apps/web/app/auth/google/callback/route.ts` - Google OAuth callback
- `apps/web/app/auth/microsoft/callback/route.ts` - Microsoft OAuth callback

## Fixes Applied

1. ✅ Changed session check from `getSession()` to `getUser()` for server validation
2. ✅ Added `credentials: 'include'` to fetch requests
3. ✅ Improved error handling to distinguish session vs email account errors
4. ✅ Added `signOut()` calls only when actual session expiration detected
5. ✅ Enhanced error messages to be more specific

## Test Coverage

| Scenario | Test Name | Status |
|----------|-----------|--------|
| Send with disconnected email | `should handle send failure when email account is disconnected` | ✅ |
| Navigate to integrations | `should navigate to integrations when email account error occurs` | ✅ |
| Reconnect and send | `should successfully send after reconnecting email account` | ✅ |
| Stay logged in | `should not log out user when email account error occurs` | ✅ |
| Error message distinction | `should distinguish between session expiration and email account errors` | ✅ |

## Next Steps

1. Add database fixtures for consistent test data
2. Implement OAuth flow mocking for full integration testing
3. Add email service mocking to verify send functionality
4. Create test utilities for email account state manipulation
5. Add performance benchmarks for send operation

