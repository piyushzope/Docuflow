# Fix Edge Function Secrets - Microsoft OAuth Token Refresh Error

## Problem

When clicking "Refresh Tokens" on the Integrations page, you're seeing this error:

```
Microsoft token refresh failed: {"error":"invalid_request","error_description":"AADSTS900144: The request body must contain the following parameter: 'client_id'."}
```

This means the `refresh-tokens` Edge Function is missing the `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` environment variables/secrets.

## Solution: Set Edge Function Secrets

### Option 1: Via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**:
   - Navigate to: https://app.supabase.com/project/nneyhfhdthpxmkemyenm
   - Go to: **Settings** → **Edge Functions** → **Secrets**

2. **Add Missing Secrets**:
   
   Click "Add Secret" and add these secrets:

   ```
   Name: MICROSOFT_CLIENT_ID
   Value: [Your Microsoft Client ID from Azure Portal]
   ```

   ```
   Name: MICROSOFT_CLIENT_SECRET
   Value: [Your Microsoft Client Secret from Azure Portal]
   ```

   **Optional (for Gmail):**
   ```
   Name: GOOGLE_CLIENT_ID
   Value: [Your Google Client ID]
   ```

   ```
   Name: GOOGLE_CLIENT_SECRET
   Value: [Your Google Client Secret]
   ```

3. **Verify Required Secrets Are Set**:
   - ✅ `ENCRYPTION_KEY` (should already be set)
   - ✅ `MICROSOFT_CLIENT_ID` (add this)
   - ✅ `MICROSOFT_CLIENT_SECRET` (add this)
   - ✅ `SUPABASE_URL` (usually auto-configured)
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` (usually auto-configured)

4. **Test Token Refresh**:
   - Go back to `/dashboard/integrations`
   - Click "Refresh Tokens" button
   - Should now work without errors

### Option 2: Via CLI Script

Run the updated secrets script:

```bash
cd /Users/pz/Documents/Apps/Docuflow_Cursor

# Set environment variables first (optional)
export MICROSOFT_CLIENT_ID="your-microsoft-client-id"
export MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
export GOOGLE_CLIENT_ID="your-google-client-id"  # Optional
export GOOGLE_CLIENT_SECRET="your-google-client-secret"  # Optional
export ENCRYPTION_KEY="your-encryption-key"

# Run the script
./set-edge-function-secrets.sh
```

The script will:
1. Set `ENCRYPTION_KEY` (required)
2. Prompt for Microsoft OAuth credentials if not in environment
3. Prompt for Google OAuth credentials if not in environment
4. Set all secrets via Supabase CLI

### Option 3: Via Supabase CLI (Manual)

```bash
# Link to project (if not already linked)
supabase link --project-ref nneyhfhdthpxmkemyenm

# Set secrets one by one
supabase secrets set ENCRYPTION_KEY="your-encryption-key"
supabase secrets set MICROSOFT_CLIENT_ID="your-microsoft-client-id"
supabase secrets set MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
supabase secrets set GOOGLE_CLIENT_ID="your-google-client-id"  # Optional
supabase secrets set GOOGLE_CLIENT_SECRET="your-google-client-secret"  # Optional
```

## Where to Find OAuth Credentials

### Microsoft OAuth Credentials

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find your app registration (or create one)
4. **Client ID**: Copy from **Overview** page (Application (client) ID)
5. **Client Secret**: Go to **Certificates & secrets** → Create new secret → Copy the **Value**

### Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID
4. **Client ID**: Copy from the credentials page
5. **Client Secret**: Copy the secret value (if you don't see it, create a new one)

### Encryption Key

- Check your `.env.local` file: `ENCRYPTION_KEY=...`
- Or use the same key you're using in your Next.js app
- Must be at least 32 characters long

## Verification

After setting secrets, verify they're configured:

1. **Via Dashboard**:
   - Go to **Settings** → **Edge Functions** → **Secrets**
   - Should see all required secrets listed

2. **Via CLI**:
   ```bash
   supabase secrets list
   ```

3. **Test Token Refresh**:
   - Go to `/dashboard/integrations`
   - Click "Refresh Tokens"
   - Should see success message (no errors)

## Troubleshooting

### Error: "client_id missing" still appears

**Solution:**
- Double-check `MICROSOFT_CLIENT_ID` is set correctly
- Make sure there are no extra spaces or quotes
- Verify the secret is set for the correct project
- Try refreshing the page after setting secrets

### Error: "client_secret invalid"

**Solution:**
- Microsoft secrets expire! Check if your secret has expired
- Create a new secret in Azure Portal
- Update the `MICROSOFT_CLIENT_SECRET` secret in Supabase

### Error: "ENCRYPTION_KEY missing"

**Solution:**
- Make sure `ENCRYPTION_KEY` is set
- Use the same key as in your Next.js app
- Minimum 32 characters

### Secrets not persisting

**Solution:**
- Make sure you're setting secrets for the correct project
- Check you're using the correct Supabase CLI version
- Try setting via Dashboard instead of CLI

## Expected Behavior After Fix

✅ Clicking "Refresh Tokens" should:
- Show "Refreshed X token(s)" message
- No error messages about missing `client_id`
- Outlook account tokens refresh successfully
- Token status updates to "Valid" (green)

## Related Files

- `set-edge-function-secrets.sh` - Updated script to set all OAuth secrets
- `supabase/functions/refresh-tokens/index.ts` - Edge Function that needs secrets
- `apps/web/app/api/refresh-tokens/route.ts` - API that calls Edge Function

## Quick Fix Checklist

- [ ] Go to Supabase Dashboard → Settings → Edge Functions → Secrets
- [ ] Add `MICROSOFT_CLIENT_ID` secret
- [ ] Add `MICROSOFT_CLIENT_SECRET` secret
- [ ] Verify `ENCRYPTION_KEY` is set
- [ ] Test "Refresh Tokens" button on `/dashboard/integrations`
- [ ] Verify no errors appear
- [ ] Check token status updates to "Valid"

Once secrets are set, the token refresh will work automatically and you won't need to reconnect accounts!

