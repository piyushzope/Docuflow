# ⚠️ Edge Function Deployment Required

## Issue

The console shows that `errorDetails` is missing from the account results, even though the code includes error detail collection. This indicates the Edge Function needs to be redeployed with the latest changes.

## Current Status

- ✅ Code updated: `supabase/functions/process-emails/index.ts` includes `errorDetails` collection
- ✅ API route updated: `/api/process-emails/route.ts` extracts and displays `errorDetails`
- ✅ UI updated: `process-emails-button.tsx` shows detailed error messages
- ❌ **Edge Function not deployed**: The deployed function doesn't have the latest error handling code

## Deployment Steps

### Option 1: Deploy via Supabase CLI (Recommended)

```bash
# Make sure you're in the project root
cd /Users/pz/Documents/Apps/Docuflow_Cursor

# Deploy the process-emails function
supabase functions deploy process-emails

# Verify deployment
supabase functions list
```

### Option 2: Deploy via Supabase Dashboard

1. Go to: https://app.supabase.com/project/nneyhfhdthpxmkemyenm
2. Navigate to: **Edge Functions** → **process-emails**
3. Click **Edit** or **Deploy**
4. Copy the entire contents of `supabase/functions/process-emails/index.ts`
5. Paste into the function editor
6. Click **Deploy**

### Verify Secrets

Make sure these secrets are set in the Edge Function:

- `ENCRYPTION_KEY` - Required for decrypting OAuth tokens
- `SUPABASE_URL` - Automatically set (usually)
- `SUPABASE_SERVICE_ROLE_KEY` - Automatically set (usually)

To check secrets:
```bash
# View secrets (values are hidden)
supabase secrets list
```

## After Deployment

1. **Test the function**:
   - Click "Process Emails Now" button in the UI
   - Check browser console for detailed error messages
   - Verify `errorDetails` appears in the response

2. **Check Edge Function logs**:
   - Go to Supabase Dashboard → Edge Functions → process-emails → Logs
   - Look for error messages with account details
   - Check for token expiration warnings

3. **Expected behavior**:
   - If errors occur, `errorDetails` array should be populated
   - Error messages should appear in toast notifications
   - Detailed errors should be logged to console

## Troubleshooting

### Still seeing "errorDetails: undefined"

1. Verify the function was deployed:
   ```bash
   supabase functions list
   ```

2. Check the deployed code matches local code:
   - Compare `supabase/functions/process-emails/index.ts` with Dashboard editor
   - Look for `errorDetails` in the deployed version

3. Clear browser cache and try again

### Function deployment fails

- Check Supabase CLI is logged in: `supabase login`
- Verify project is linked: `supabase link --project-ref nneyhfhdthpxmkemyenm`
- Check function size isn't too large (should be < 1MB)

## Next Steps

After deployment, the error handling should work correctly and you'll see specific error messages like:

- "Gmail API authentication failed (401): Token may be expired"
- "Outlook API error: Rate limit exceeded"
- "Error fetching messages: Network timeout"

Instead of generic "1 error occurred" messages.

