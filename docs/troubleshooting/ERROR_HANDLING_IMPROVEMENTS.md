# Error Handling Improvements for Email Processing

## Overview

Enhanced error handling in the email processing edge function to provide better diagnostics for OAuth token expiration and API failures.

## Improvements Made

### 1. Enhanced API Error Handling

**Location**: All Gmail and Outlook API helper functions

**Changes**:
- Added specific handling for 401 (Unauthorized) errors
- Improved error messages with status codes
- Include error text from API responses
- Clear indication when tokens may be expired

**Functions Updated**:
- `fetchGmailMessages()` - List emails
- `fetchGmailMessage()` - Get email details
- `downloadGmailAttachment()` - Download attachments
- `fetchOutlookMessages()` - List emails
- `fetchOutlookMessage()` - Get email details
- `downloadOutlookAttachment()` - Download attachments

### 2. Token Expiration Detection

**Location**: `processEmailAccount()` error handler

**Changes**:
- Detects 401 errors in error messages
- Logs specific warning for token expiration
- Provides actionable guidance (refresh tokens or reconnect)

### Before

```typescript
if (!response.ok) {
  throw new Error(`Gmail API error: ${response.statusText}`);
}
```

### After

```typescript
if (!response.ok) {
  if (response.status === 401) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Gmail API authentication failed (401): Token may be expired. Please refresh OAuth tokens. ${errorText}`);
  }
  const errorText = await response.text().catch(() => '');
  throw new Error(`Gmail API error (${response.status}): ${response.statusText} ${errorText}`);
}
```

## Error Message Examples

### Token Expired Error

```
Gmail API authentication failed (401): Token may be expired. Please refresh OAuth tokens. {"error": "invalid_grant", ...}
```

### General API Error

```
Gmail API error (429): Too Many Requests {"error": "rateLimitExceeded", ...}
```

### Account Processing Error Log

```
Error processing email account abc123 (user@example.com): Gmail API authentication failed (401): Token may be expired...
⚠️ Token may be expired for account user@example.com. Please run refresh-tokens function or reconnect account.
```

## Benefits

1. **Clearer Diagnostics**: Error messages now indicate token expiration explicitly
2. **Actionable Guidance**: Users know to refresh tokens or reconnect
3. **Better Logging**: Specific warnings for token issues
4. **Improved Debugging**: Error text from APIs included in logs

## How It Works

### Token Expiration Flow

1. **Email Processing Attempt**:
   - Edge function tries to fetch emails
   - API returns 401 if token expired

2. **Error Detection**:
   - 401 status code detected
   - Error message includes token expiration notice

3. **Error Logging**:
   - Error logged with account details
   - Specific warning logged for token expiration
   - Guidance provided: refresh tokens or reconnect

4. **User Action**:
   - User sees error in logs
   - Can trigger `refresh-tokens` function
   - OR reconnect email account via UI

## Testing Token Expiration

### Simulate Expired Token

1. **Set Expired Token** (for testing):
   ```sql
   UPDATE email_accounts
   SET expires_at = NOW() - INTERVAL '1 day'
   WHERE email = 'test@example.com';
   ```

2. **Trigger Email Processing**:
   - Use manual trigger button or API
   - Wait for cron job to run

3. **Check Logs**:
   - Look for 401 errors
   - Look for token expiration warnings
   - Verify error messages are clear

### Fix Expired Token

1. **Option 1: Refresh Tokens Function**:
   ```bash
   # Trigger refresh-tokens edge function
   supabase functions invoke refresh-tokens --no-verify-jwt
   ```

2. **Option 2: Reconnect Account**:
   - Go to `/dashboard/integrations`
   - Disconnect and reconnect the account

## Related Components

- **refresh-tokens Edge Function**: Handles automatic token refresh
- **Cron Jobs**: Refresh tokens hourly (if configured)
- **OAuth Callbacks**: Re-authenticate when tokens expire

## Monitoring

### Key Log Patterns to Watch

1. **Token Expiration**:
   ```
   ⚠️ Token may be expired for account X
   ```

2. **Authentication Failures**:
   ```
   Gmail API authentication failed (401)
   Microsoft Graph API authentication failed (401)
   ```

3. **API Errors**:
   ```
   Gmail API error (429): Too Many Requests
   Microsoft Graph API error (500): Internal Server Error
   ```

### Alert Thresholds

- **High Priority**: Multiple accounts with token expiration
- **Medium Priority**: Single account with repeated 401 errors
- **Low Priority**: Occasional 401 errors (may be transient)

## Next Steps

1. **Deploy Updated Edge Function**: Includes improved error handling
2. **Monitor Logs**: Watch for token expiration warnings
3. **Verify Token Refresh**: Ensure refresh-tokens cron job is working
4. **Document for Users**: Add troubleshooting guide for token issues

---

**Error handling improvements complete!** ✅

Errors are now more diagnostic and provide clear guidance for resolving token expiration issues.

