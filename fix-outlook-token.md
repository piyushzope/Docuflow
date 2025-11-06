# Fix Outlook Token Error

## Problem

The Outlook account `docuflow2025@outlook.com` has a malformed OAuth token. The error message shows:

```
Microsoft Graph API authentication failed (401): Token may be expired. 
JWT is not well formed, there are no dots (.)
```

This indicates the encrypted token in the database is corrupted or not in the correct JWT format.

## Solution: Reconnect the Account

### Step 1: Go to Integrations Page

Navigate to: `http://localhost:3000/dashboard/integrations`

### Step 2: Disconnect Outlook Account

1. Find the Outlook account (`docuflow2025@outlook.com`)
2. Click "Disconnect" or remove the account
3. Confirm the disconnection

### Step 3: Reconnect Outlook Account

1. Click "Connect Microsoft" or "Connect Outlook"
2. Complete the OAuth flow
3. Grant necessary permissions (email, calendar, etc.)
4. The account will be reconnected with fresh tokens

### Step 4: Verify

After reconnecting, test email processing:

1. Click "Process Emails Now" button
2. Check console for any errors
3. Verify the error is resolved

## Alternative: Refresh Tokens Function

If the `refresh-tokens` function is deployed, you can try refreshing:

```bash
# Test refresh-tokens function
curl -X POST \
  'https://nneyhfhdthpxmkemyenm.supabase.co/functions/v1/refresh-tokens' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

However, if the token is malformed (not a valid JWT), refresh may not work and reconnection is required.

## Why This Happened

Possible causes:
1. Token encryption/decryption issue
2. Token corrupted during storage
3. Token format changed by Microsoft API
4. Database migration issue

## Prevention

The `refresh-tokens` Edge Function should automatically refresh tokens before they expire. Ensure:
- Cron job is set up to run `refresh-tokens` periodically
- Tokens are refreshed when they're within 1 hour of expiration

## Verification

After reconnecting, verify the token is valid:

```sql
-- Check token expiration
SELECT 
  email, 
  provider, 
  expires_at,
  CASE 
    WHEN expires_at IS NULL THEN 'No expiration set'
    WHEN expires_at < NOW() THEN 'Expired'
    WHEN expires_at < NOW() + INTERVAL '1 hour' THEN 'Expiring soon'
    ELSE 'Valid'
  END as token_status
FROM email_accounts
WHERE email = 'docuflow2025@outlook.com';
```

Then test email processing again to confirm the error is resolved.

