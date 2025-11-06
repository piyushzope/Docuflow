# Automatic Token Refresh Solution

## Problem

Users were experiencing Microsoft OAuth token expiration errors requiring manual reconnection:

```
Microsoft Graph API authentication failed (401): Token may be expired. Please refresh OAuth tokens.
{"error":{"code":"InvalidAuthenticationToken","message":"IDX14100: JWT is not well formed, there are no dots (.)."}}
```

This forced users to:
1. Navigate to Integrations page
2. Disconnect email account
3. Reconnect email account
4. Complete OAuth flow again

## Solution Implemented

Added **automatic token refresh** to the `send-request` API route that:

1. **Validates token format** before use (checks for proper JWT format with dots)
2. **Checks token expiration** (refreshes if expired or expiring within 5 minutes)
3. **Automatically refreshes** tokens when they expire or become invalid
4. **Retries on 401 errors** with refreshed tokens
5. **Provides clear error messages** only when refresh fails

### Key Features

- ✅ **No user intervention required** - tokens refresh automatically
- ✅ **Proactive refresh** - refreshes tokens before they expire (5-minute buffer)
- ✅ **Malformed token detection** - detects and fixes corrupted tokens
- ✅ **Automatic retry** - retries email send after successful token refresh
- ✅ **Graceful degradation** - only asks for reconnection if refresh truly fails

## Implementation Details

### Files Modified

**`apps/web/app/api/send-request/route.ts`**

Added:
- `validateTokenFormat()` - Validates JWT token format (must have dots)
- `isTokenExpired()` - Checks if token is expired or expiring soon
- `refreshGoogleToken()` - Refreshes Google OAuth tokens
- `refreshMicrosoftToken()` - Refreshes Microsoft OAuth tokens
- `refreshAccountTokens()` - Refreshes tokens and updates database
- Enhanced `sendRequestEmail()` - Now includes automatic token refresh

### How It Works

1. **Before Sending Email:**
   ```typescript
   // Validate token format
   if (!validateTokenFormat(accessToken)) {
     // Attempt to refresh malformed token
     await refreshAccountTokens(...)
   }
   
   // Check expiration
   if (isTokenExpired(emailAccount.expires_at)) {
     // Refresh expired/expiring token
     await refreshAccountTokens(...)
   }
   ```

2. **On 401 Error:**
   ```typescript
   try {
     await sendEmail(...)
   } catch (error) {
     if (is401Error(error)) {
       // Refresh token and retry
       await refreshAccountTokens(...)
       await sendEmail(...) // Retry with new token
     }
   }
   ```

3. **Token Refresh Process:**
   - Decrypts refresh token from database
   - Calls OAuth provider API to get new tokens
   - Validates new token format
   - Encrypts and stores new tokens
   - Updates expiration timestamp

## User Experience

### Before Fix
- User clicks "Send" on document request
- Gets error: "Token expired. Please reconnect."
- User must navigate to Integrations
- Disconnect and reconnect account
- Try sending again

### After Fix
- User clicks "Send" on document request
- System automatically detects expired token
- System automatically refreshes token
- Email sends successfully
- User sees no errors (seamless experience)

## Error Handling

### Automatic Refresh Success
- Token refreshed successfully
- Email sent with new token
- User sees success message
- No action required

### Refresh Failure (Rare)
Only happens if:
- Refresh token is invalid/revoked
- OAuth provider is down
- Network issues

In this case:
- Account marked as `is_active: false`
- Clear error message: "Token refresh failed. Please reconnect your email account in Integrations."
- User knows exactly what to do

## Token Refresh Logic

### Token Expiration Check
- Tokens are refreshed if:
  - `expires_at` is null
  - `expires_at` is in the past
  - `expires_at` is within 5 minutes (buffer to prevent edge cases)

### Token Format Validation
- Validates JWT format: must have at least 2 dots (header.payload.signature)
- If malformed, attempts refresh immediately
- If refresh fails, asks user to reconnect

### Automatic Retry
- On 401 error, automatically refreshes token
- Retries email send with new token
- Only fails if refresh also fails

## Testing

To test the automatic refresh:

1. **Test with expired token:**
   - Set `expires_at` to past date in database
   - Try to send email
   - Should automatically refresh and send

2. **Test with malformed token:**
   - Corrupt token in database (remove dots)
   - Try to send email
   - Should detect, refresh, and send

3. **Test with 401 error:**
   - Use expired token (that passes format check)
   - Try to send email
   - Should catch 401, refresh, retry

## Environment Variables Required

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# Encryption (for token storage)
ENCRYPTION_KEY=your-encryption-key
```

## Related Systems

### Edge Function: `refresh-tokens`
- Scheduled cron job that refreshes tokens proactively
- Runs every hour
- Refreshes tokens expiring in next hour
- Works alongside this API-level refresh

### Process-Emails Function
- Already has automatic token refresh
- Uses same pattern as this implementation
- Ensures consistency across the codebase

## Benefits

1. **Better UX** - Users don't need to reconnect repeatedly
2. **Reduced Support** - Fewer "token expired" support tickets
3. **Higher Reliability** - Emails send successfully even with expired tokens
4. **Proactive** - Refreshes before expiration (5-minute buffer)
5. **Self-Healing** - Automatically fixes malformed tokens

## Future Enhancements

1. **Cache refreshed tokens** - Avoid unnecessary refreshes
2. **Batch refresh** - Refresh multiple accounts at once
3. **Refresh metrics** - Track refresh success/failure rates
4. **Token health dashboard** - Show token status in UI

## Troubleshooting

### Issue: Refresh still fails
**Solution:** Check:
- OAuth credentials are correct
- Refresh token is valid (not revoked)
- Network connectivity
- OAuth provider status

### Issue: Still getting 401 errors
**Solution:** 
- Check if refresh token exists in database
- Verify refresh token is not expired (Microsoft refresh tokens can expire)
- Check OAuth provider logs

### Issue: Token format validation fails
**Solution:**
- Token may be corrupted in database
- Try manually reconnecting account
- Check encryption/decryption is working correctly

## Summary

This solution eliminates the need for users to manually reconnect email accounts when tokens expire. The system now:

✅ **Automatically detects** token expiration  
✅ **Automatically refreshes** tokens  
✅ **Automatically retries** failed operations  
✅ **Provides clear errors** only when refresh truly fails  

Users can now focus on their work instead of managing OAuth tokens!

