# Token Refresh Edge Function - Deployment Guide

## Overview

The `refresh-tokens` Edge Function automatically refreshes OAuth tokens for email accounts and storage configs before they expire. This prevents the token expiration issues we just fixed.

## Current Status

- ✅ Function code complete: `supabase/functions/refresh-tokens/index.ts`
- ✅ Manual trigger API: `apps/web/app/api/refresh-tokens/route.ts`
- ❌ **Not yet deployed** to Supabase

## Deployment Options

### Option 1: Deploy via Supabase Dashboard (Recommended - No Docker Required)

1. **Go to Supabase Dashboard**:
   - Navigate to: https://app.supabase.com/project/nneyhfhdthpxmkemyenm
   - Go to: **Edge Functions** → **refresh-tokens**

2. **Create/Edit Function**:
   - If the function doesn't exist, click **"Create Function"**
   - Name it: `refresh-tokens`
   - Copy the entire contents of `supabase/functions/refresh-tokens/index.ts`
   - Paste into the function editor

3. **Deploy**:
   - Click **"Deploy"** button
   - Wait for deployment to complete

4. **Set Secrets**:
   - Go to **Settings** → **Edge Functions** → **Secrets**
   - Ensure these secrets are set:
     - `ENCRYPTION_KEY` (required)
     - `GOOGLE_CLIENT_ID` (optional, for Gmail)
     - `GOOGLE_CLIENT_SECRET` (optional, for Gmail)
     - `MICROSOFT_CLIENT_ID` (optional, for Outlook)
     - `MICROSOFT_CLIENT_SECRET` (optional, for Outlook)

5. **Verify Deployment**:
   - Function should appear in the list with status "Active"
   - Test manually using the API endpoint or dashboard

### Option 2: Deploy via CLI (Requires Docker)

```bash
# Start Docker Desktop first
# Then run:
cd /Users/pz/Documents/Apps/Docuflow_Cursor
supabase functions deploy refresh-tokens
```

## Manual Testing

### Test via API Endpoint

After deployment, you can trigger token refresh manually:

```bash
# Using curl (replace YOUR_SERVICE_ROLE_KEY)
curl -X POST \
  'https://nneyhfhdthpxmkemyenm.supabase.co/functions/v1/refresh-tokens' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### Test via UI (After UI Button is Added)

1. Go to `/dashboard/integrations`
2. Click "Refresh Tokens" button (if implemented)
3. Check console for results

### Test via Next.js API Route

The `/api/refresh-tokens` endpoint is already created:

```bash
# From your Next.js app (requires authentication)
curl -X POST http://localhost:3000/api/refresh-tokens \
  -H 'Content-Type: application/json' \
  -H 'Cookie: your-session-cookie'
```

## What It Does

1. **Finds Expiring Tokens**:
   - Email accounts with tokens expiring in the next hour
   - Storage configs with OAuth tokens (Google Drive, OneDrive)

2. **Refreshes Tokens**:
   - Google OAuth tokens (Gmail, Google Drive)
   - Microsoft OAuth tokens (Outlook, OneDrive)

3. **Updates Database**:
   - Encrypts new access tokens
   - Updates expiration times
   - Stores new refresh tokens (if provided)

4. **Returns Results**:
   - Number of tokens refreshed
   - Any errors encountered
   - Detailed results per account/config

## Automation Setup

### Cron Job Configuration

To run automatically every hour, set up a cron job:

```sql
-- Run in Supabase SQL Editor
SELECT cron.schedule(
  'refresh-oauth-tokens',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url := 'https://nneyhfhdthpxmkemyenm.supabase.co/functions/v1/refresh-tokens',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

**Note**: This requires `pg_cron` extension and proper database settings. See `SUPABASE_CRON_SETUP.md` for complete setup.

## Expected Behavior

### Success Response

```json
{
  "success": true,
  "message": "Token refresh completed",
  "refreshed": 2,
  "errors": 0,
  "results": [
    {
      "accountId": "...",
      "accountEmail": "user@example.com",
      "provider": "outlook",
      "success": true
    }
  ],
  "duration_ms": 1234
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "duration_ms": 123
}
```

## Troubleshooting

### Function Not Found

- Verify function is deployed: Check Supabase Dashboard
- Check function name matches exactly: `refresh-tokens`

### Missing Secrets

- Error: "Missing ENCRYPTION_KEY"
- Solution: Set secrets in Supabase Dashboard → Edge Functions → Secrets

### Token Refresh Fails

- Check OAuth client credentials are correct
- Verify refresh tokens are valid (not expired)
- Check Edge Function logs for detailed error messages

### No Tokens Refreshed

- This is normal if no tokens are expiring in the next hour
- Check `expires_at` field in `email_accounts` table
- Tokens are only refreshed if `expires_at < NOW() + 1 hour`

## Next Steps

1. ✅ **Deploy the function** (via Dashboard or CLI)
2. ✅ **Test manually** using the API endpoint
3. ✅ **Set up cron job** for automatic hourly refresh
4. ✅ **Monitor logs** to ensure it's working correctly

## Benefits

- **Prevents token expiration** - Tokens refreshed before they expire
- **Automatic operation** - No manual intervention needed
- **Reduces errors** - Fewer "token expired" errors in email processing
- **Better reliability** - Email processing continues uninterrupted

---

**Status**: Ready for Deployment

