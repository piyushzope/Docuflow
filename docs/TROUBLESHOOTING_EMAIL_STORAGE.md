# Troubleshooting Email-to-Storage Pipeline

This guide helps diagnose and fix issues where email files are not appearing in cloud storage.

## Quick Diagnosis

### Step 1: Check Upload Status

1. Go to `/dashboard/documents`
2. Look for the "Upload" column - it shows verification status:
   - ✅ **Verified**: File exists in storage
   - ⏳ **Pending**: Verification not yet completed
   - ❌ **Failed**: Upload or verification failed
   - ⚠️ **Not Found**: File not found in storage

### Step 2: Check Error Details

1. Click on a document with failed/not_found status
2. Check the `upload_error` field for specific error message
3. Common errors:
   - `[token]`: OAuth token expired or invalid
   - `[permission]`: Insufficient permissions
   - `[path]`: Invalid folder path
   - `[network]`: Network/connection issue

### Step 3: Verify Configuration

1. **Storage Configuration**:
   - Go to `/dashboard/storage`
   - Ensure at least one storage is marked as "Default"
   - Click "Test Connection" to verify tokens and permissions

2. **Email Accounts**:
   - Go to `/dashboard/integrations`
   - Check that email accounts show "Active" status
   - If tokens are expired, reconnect the account

3. **Cron Jobs**:
   - Admin users can check `/api/admin/cron-status`
   - Verify `process-emails` job runs every 5 minutes
   - Check for recent failures

## Common Issues and Solutions

### Issue: Files Not Appearing in Storage

**Symptoms**:
- Documents show "Pending" or "Not Found" status
- No error message displayed

**Solutions**:

1. **Verify Storage Connection**:
   ```bash
   # Test storage connection via API
   curl -X POST /api/storage/{storage_id}/test-connection
   ```

2. **Check Storage Path**:
   - Verify root folder path is correct
   - Ensure folder exists and has write permissions
   - Check routing rule folder paths match expected locations

3. **Manually Verify Upload**:
   ```bash
   # Verify a specific document
   curl -X GET /api/documents/{document_id}/verify
   ```

### Issue: Token Expired Errors

**Symptoms**:
- Error message contains `[token]` or `401`
- "Token may be expired" message

**Solutions**:

1. **Automatic Refresh**:
   - System should automatically refresh tokens
   - Check `/api/admin/cron-status` to verify `refresh-tokens` job is running

2. **Manual Refresh**:
   - Go to `/dashboard/integrations`
   - Disconnect and reconnect the email account
   - Or trigger token refresh manually via Supabase Dashboard

3. **Storage Token Refresh**:
   - Go to `/dashboard/storage`
   - Click "Test Connection" - this will attempt to refresh if needed
   - If it fails, reconnect the storage configuration

### Issue: Permission Errors

**Symptoms**:
- Error message contains `[permission]` or `403`
- "Forbidden" or "Access denied" messages

**Solutions**:

1. **Check OAuth Scopes**:
   - Ensure OAuth app has required scopes:
     - OneDrive: `Files.ReadWrite`, `User.Read`
     - Google Drive: `https://www.googleapis.com/auth/drive.file`

2. **Verify Folder Permissions**:
   - Check that the root folder path exists
   - Ensure the OAuth account has write access to the folder
   - Test by manually uploading a file to the folder

3. **Reconnect Storage**:
   - Go to `/dashboard/storage`
   - Disconnect and reconnect to refresh permissions

### Issue: Path Not Found Errors

**Symptoms**:
- Error message contains `[path]` or `404`
- "Folder not found" messages

**Solutions**:

1. **Check Routing Rules**:
   - Go to `/dashboard/rules`
   - Verify folder paths in routing rules are correct
   - Check for typos or invalid characters

2. **Verify Root Folder**:
   - In storage configuration, verify root folder path
   - Ensure it matches the actual folder in storage
   - For OneDrive, path should be relative to root (e.g., "Documents/Subfolder")

3. **Test Folder Creation**:
   - System should auto-create folders, but verify permissions allow creation
   - Check storage logs for folder creation errors

### Issue: Cron Jobs Not Running

**Symptoms**:
- No new documents processed
- Cron status shows no recent executions

**Solutions**:

1. **Check pg_cron Extension**:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```
   - If not enabled, enable it in Supabase Dashboard → Database → Extensions

2. **Verify Cron Jobs**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'process-emails';
   ```
   - Ensure job is active and scheduled correctly

3. **Check Execution History**:
   ```sql
   SELECT * FROM cron_job_executions 
   WHERE job_name = 'process-emails' 
   ORDER BY started_at DESC 
   LIMIT 10;
   ```
   - Look for error messages in recent executions

4. **Manual Trigger**:
   - Go to dashboard and click "Process Emails Now"
   - Or call `/api/process-emails` endpoint

## Verification Tools

### Manual Verification Script

```bash
# Verify all documents in storage
npx tsx scripts/verify-storage-uploads.ts

# Update verification status in database
npx tsx scripts/verify-storage-uploads.ts --fix
```

### Test Email Processing

```bash
# Test end-to-end email processing
npx tsx scripts/test-email-processing.ts
```

### SQL Queries

```sql
-- Check documents with upload issues
SELECT 
  id,
  original_filename,
  storage_provider,
  upload_verification_status,
  upload_error,
  created_at
FROM documents
WHERE upload_error IS NOT NULL 
   OR upload_verification_status IN ('failed', 'not_found')
ORDER BY created_at DESC;

-- Check recent upload errors
SELECT 
  d.original_filename,
  d.upload_error,
  sc.name AS storage_config,
  ea.email AS email_account
FROM documents d
LEFT JOIN storage_configs sc ON d.storage_config_id = sc.id
LEFT JOIN email_accounts ea ON d.email_account_id = ea.id
WHERE d.upload_error IS NOT NULL
ORDER BY d.created_at DESC
LIMIT 20;
```

## Monitoring

### Admin Dashboard

Admins can access:
- `/api/admin/upload-errors` - List all upload errors
- `/api/admin/cron-status` - Check cron job status

### Activity Logs

Check activity logs for detailed upload history:
```sql
SELECT * FROM activity_logs
WHERE action IN ('upload', 'upload_failed', 'verify_upload')
ORDER BY created_at DESC
LIMIT 50;
```

## Prevention

1. **Regular Token Refresh**: Ensure `refresh-tokens` cron job runs hourly
2. **Storage Validation**: Test storage connections periodically
3. **Monitor Alerts**: Set up alerts for upload failures
4. **Regular Verification**: Run verification script weekly to catch issues early

## Getting Help

If issues persist:
1. Check Edge Function logs in Supabase Dashboard
2. Review activity logs for detailed error information
3. Verify all environment variables are set correctly
4. Ensure OAuth apps are properly configured with correct scopes

