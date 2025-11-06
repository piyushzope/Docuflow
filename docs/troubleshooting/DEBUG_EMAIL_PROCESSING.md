# Debugging Email Processing Errors

## Issue: "1 error occurred during processing"

When clicking "Process Emails Now", you're seeing a warning that 1 error occurred, but no details about what the error is.

## Enhanced Error Reporting

I've improved the error reporting to show detailed error messages. The error details will now appear in:

1. **Toast Notification**: Shows the first error message
2. **Browser Console**: Shows all error details for debugging

## How to Debug

### Step 1: Check Browser Console

1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to **Console** tab
3. Click "Process Emails Now" button
4. Look for:
   - `Email processing response:` - Full response from API
   - `Email processing errors:` - Array of error messages
   - `Additional errors:` - Any additional errors beyond the first

### Step 2: Common Error Causes

#### 1. OAuth Token Expired (401 Error)

**Symptoms**:
- Error message contains "401" or "expired" or "authentication failed"
- Error mentions "Token may be expired"

**Solution**:
```bash
# Option 1: Trigger token refresh
# Via Supabase Dashboard → Edge Functions → refresh-tokens → Invoke

# Option 2: Reconnect email account
# Go to /dashboard/integrations
# Disconnect and reconnect the account
```

#### 2. Missing Storage Configuration

**Symptoms**:
- Error: "No storage configuration found"
- No default storage config set

**Solution**:
1. Go to `/dashboard/storage`
2. Configure at least one storage (OneDrive, Google Drive, or Supabase Storage)
3. Mark it as default

#### 3. OAuth Token Decryption Failed

**Symptoms**:
- Error: "Failed to decrypt data"
- ENCRYPTION_KEY mismatch

**Solution**:
1. Verify ENCRYPTION_KEY is set in edge function secrets
2. Ensure it matches the key used when connecting accounts
3. Check Supabase Dashboard → Edge Functions → process-emails → Secrets

#### 4. API Rate Limiting (429 Error)

**Symptoms**:
- Error: "429" or "Too Many Requests"
- Gmail/Outlook API rate limit exceeded

**Solution**:
- Wait a few minutes and try again
- Rate limits reset after a short period

#### 5. Network/Connection Issues

**Symptoms**:
- Timeout errors
- Connection refused
- Network errors

**Solution**:
- Check internet connection
- Verify Supabase edge function is deployed
- Check Supabase status page

### Step 3: Check Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to **Edge Functions** → **process-emails**
3. Click **Logs** tab
4. Look for:
   - Error messages with account details
   - Token expiration warnings (⚠️)
   - API error responses

### Step 4: Test Individual Components

#### Test Edge Function Directly

```bash
# Using Supabase CLI
supabase functions invoke process-emails --no-verify-jwt

# Using HTTP (replace YOUR_SERVICE_ROLE_KEY)
curl -X POST \
  'https://nneyhfhdthpxmkemyenm.supabase.co/functions/v1/process-emails' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

#### Check Email Accounts

```sql
-- Check active email accounts
SELECT id, email, provider, is_active, expires_at, last_sync_at
FROM email_accounts
WHERE is_active = true;

-- Check for expired tokens
SELECT email, provider, expires_at
FROM email_accounts
WHERE is_active = true
  AND expires_at IS NOT NULL
  AND expires_at < NOW();
```

#### Check Storage Configuration

```sql
-- Check for default storage config
SELECT id, provider, is_default, is_active
FROM storage_configs
WHERE is_default = true
  AND is_active = true;
```

## Improved Error Messages

After the update, errors will show:

### Before
```
⚠️ 1 error occurred during processing
```

### After
```
⚠️ Error: user@example.com: Gmail API authentication failed (401): Token may be expired...
```

Full error details in browser console.

## Next Steps

1. **Click the button again** after the update
2. **Check browser console** for detailed error messages
3. **Check edge function logs** in Supabase Dashboard
4. **Fix the specific error** based on the message:
   - Token expired → Refresh tokens or reconnect
   - Missing storage → Configure storage
   - Other errors → Check logs for details

## Quick Fixes

### Most Common: Token Expired

```bash
# Refresh tokens
# Go to Supabase Dashboard → Edge Functions → refresh-tokens → Invoke
```

### Missing Storage

1. Navigate to `/dashboard/storage`
2. Click "Configure Storage"
3. Set up OneDrive, Google Drive, or Supabase Storage
4. Mark as default

### Wrong Encryption Key

1. Check edge function secrets match your app encryption key
2. Verify in Supabase Dashboard → Edge Functions → process-emails → Secrets
3. ENCRYPTION_KEY should match your `.env.local` file

---

## Storage Verification

### Check Upload Status

After processing, verify files exist in storage:

1. **Via Dashboard**:
   - Go to `/dashboard/documents`
   - Check "Upload" column for verification status
   - Failed uploads show error message on hover

2. **Via API**:
   ```bash
   # Verify a specific document
   curl -X GET /api/documents/{document_id}/verify
   ```

3. **Via Script**:
   ```bash
   # Verify all documents
   npx tsx scripts/verify-storage-uploads.ts
   ```

### Storage Path Verification

If files are uploaded but not found:

1. **Check Storage Path**:
   - Document record shows `storage_path`
   - For OneDrive: This is the drive item ID, not the file path
   - Check metadata for `onedrive_path` or `storage_path_display`

2. **Verify Root Folder**:
   - Check storage config `rootFolderPath` or `rootFolderId`
   - Ensure it matches the actual folder in storage
   - Test connection to verify folder exists

3. **Routing Rule Paths**:
   - Check routing rule `folder_path` template
   - Verify placeholders like `{sender_email}`, `{date}` are resolved correctly
   - Test with a sample email to see generated path

### Upload Error Debugging

1. **Check Error Category**:
   - `[token]`: OAuth token issue - refresh or reconnect
   - `[permission]`: Insufficient permissions - check OAuth scopes
   - `[path]`: Folder path issue - verify routing rules
   - `[network]`: Connection issue - check internet/firewall
   - `[rate_limit]`: API rate limit - wait and retry

2. **View Detailed Errors**:
   ```sql
   SELECT 
     original_filename,
     upload_error,
     upload_verification_status,
     metadata
   FROM documents
   WHERE upload_error IS NOT NULL
   ORDER BY created_at DESC;
   ```

3. **Check Activity Logs**:
   ```sql
   SELECT * FROM activity_logs
   WHERE action = 'upload_failed'
   ORDER BY created_at DESC;
   ```

---

**After updating**, click "Process Emails Now" again and check the browser console for the specific error message!

For more detailed troubleshooting, see [TROUBLESHOOTING_EMAIL_STORAGE.md](./TROUBLESHOOTING_EMAIL_STORAGE.md).

