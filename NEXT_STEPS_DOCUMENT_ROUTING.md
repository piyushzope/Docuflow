# Next Steps: Document Routing Fix Deployment

This guide outlines the steps to deploy and verify the document routing fixes for email responses.

## Prerequisites

- ✅ Code changes have been made (subject normalization, document-request linking, error logging)
- ✅ Supabase project with Edge Functions enabled
- ✅ Supabase CLI installed (optional, for easier deployment)
- ✅ Access to Supabase Dashboard

---

## Step 1: Deploy the Updated Edge Function

The main fix is in `supabase/functions/process-emails/index.ts`. You need to deploy this to Supabase.

### Option A: Using Supabase CLI (Recommended)

```bash
# Make sure you're logged in
supabase login

# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy process-emails
```

### Option B: Using Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** → **process-emails**
3. Copy the contents of `supabase/functions/process-emails/index.ts`
4. Paste into the function editor
5. Click **Deploy**

### Option C: Using Supabase CLI Direct Upload

```bash
# Deploy from the project root
supabase functions deploy process-emails --no-verify-jwt
```

---

## Step 2: Verify Edge Function Environment Variables

The Edge Function needs these environment variables set in Supabase:

1. Go to **Project Settings** → **Edge Functions** → **process-emails**
2. Verify these secrets are set:
   - `ENCRYPTION_KEY` - Your encryption key for decrypting tokens
   - `SUPABASE_URL` - Your Supabase project URL (usually auto-set)
   - `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (usually auto-set)

To set secrets via CLI:
```bash
supabase secrets set ENCRYPTION_KEY=your-encryption-key
```

To set secrets via Dashboard:
1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add `ENCRYPTION_KEY` with your encryption key value

---

## Step 3: Test the Edge Function Manually

Before relying on the cron job, test the function manually to ensure it works:

### Via Supabase CLI

```bash
supabase functions invoke process-emails \
  --no-verify-jwt \
  --body '{}'
```

### Via HTTP Request

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/process-emails' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### Check the Response

You should see a JSON response like:
```json
{
  "success": true,
  "message": "Email processing completed",
  "processed": 0,
  "errors": 0,
  "accounts_processed": 1,
  "account_results": [...]
}
```

### Check Logs

View function logs to see if there are any errors:
```bash
supabase functions logs process-emails
```

Or in Dashboard: **Edge Functions** → **process-emails** → **Logs**

---

## Step 4: Verify Routing Rules Configuration

Ensure your routing rules are properly configured:

1. Go to your dashboard → **Routing Rules**
2. Verify at least one active rule exists with:
   - **Subject Pattern** or **Sender Pattern** that matches your test scenario
   - **Storage** configured to use your OneDrive account
   - **Folder Path** defined
   - **Is Active** = true

### Example Routing Rule for Testing

Create a test rule that matches responses from a specific sender:

```json
{
  "conditions": {
    "sender_pattern": ".*@example\\.com",  // Match any email from example.com
    "subject_pattern": ".*Document Request.*"  // Match subject containing "Document Request"
  },
  "actions": {
    "storage_id": "your-onedrive-storage-config-id",
    "folder_path": "documents/{employee_name}/{date}"
  },
  "priority": 10,
  "is_active": true
}
```

**Note**: With the fix, this rule will now match even if the subject has "Re:" or "Fwd:" prefixes.

---

## Step 5: Test the Complete Flow

### Test Scenario 1: Email Response with "Re:" Prefix

1. **Send a Document Request**:
   - Create a document request to `testuser@example.com`
   - Subject: "Document Request: Please submit W-2 form"
   - Send the request

2. **Simulate Email Response**:
   - Have `testuser@example.com` reply with subject "Re: Document Request: Please submit W-2 form"
   - Attach a PDF file
   - Send the reply

3. **Trigger Email Processing**:
   ```bash
   # Manually invoke the function
   supabase functions invoke process-emails --no-verify-jwt
   ```

4. **Verify Results**:
   - Check Supabase Dashboard → **Documents** table
   - Verify the document was created with:
     - ✅ `routing_rule_id` is set (rule matched!)
     - ✅ `storage_path` points to OneDrive
     - ✅ `document_request_id` is set (linked to request!)
     - ✅ `status` = 'received'

5. **Check OneDrive**:
   - Log into the connected OneDrive account
   - Navigate to the folder path specified in the routing rule
   - Verify the file is present

### Test Scenario 2: Verify Subject Normalization

Test that various email prefixes are handled:

- Original subject: "Document Request: W-2"
- Test these response subjects:
  - ✅ "Re: Document Request: W-2"
  - ✅ "Fwd: Document Request: W-2"
  - ✅ "Re:Fwd: Document Request: W-2"
  - ✅ "[External] Re: Document Request: W-2"

All should match routing rules with pattern `.*Document Request.*`

---

## Step 6: Monitor Cron Job Execution

If you're using the cron job to process emails automatically:

### Check Cron Job Status

```sql
-- View cron job details
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  jobid
FROM cron.job 
WHERE jobname = 'process-emails';
```

### View Recent Executions

```sql
-- Check recent runs
SELECT 
  runid,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'process-emails'
)
ORDER BY start_time DESC
LIMIT 10;
```

### Check for Errors

```sql
-- Find failed executions
SELECT 
  runid,
  status,
  return_message,
  start_time
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'process-emails'
)
AND status = 'failed'
AND start_time > NOW() - INTERVAL '24 hours'
ORDER BY start_time DESC;
```

---

## Step 7: Verify Database Updates

### Check Document Records

```sql
-- View recently processed documents
SELECT 
  id,
  sender_email,
  original_filename,
  storage_path,
  storage_provider,
  routing_rule_id,
  document_request_id,
  status,
  created_at
FROM documents
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Check Document Request Status Updates

```sql
-- Verify document requests were marked as received
SELECT 
  dr.id,
  dr.recipient_email,
  dr.subject,
  dr.status,
  dr.completed_at,
  COUNT(d.id) as document_count
FROM document_requests dr
LEFT JOIN documents d ON d.document_request_id = dr.id
WHERE dr.completed_at > NOW() - INTERVAL '1 hour'
GROUP BY dr.id
ORDER BY dr.completed_at DESC;
```

---

## Step 8: Troubleshooting

### Issue: Documents Not Appearing in OneDrive

**Check:**
1. OneDrive access token is valid and not expired
2. Storage config has `rootFolderPath` set correctly
3. Routing rule `folder_path` is valid
4. Check function logs for upload errors

**SQL to check storage config:**
```sql
SELECT 
  id,
  provider,
  is_active,
  config->>'rootFolderPath' as root_folder_path
FROM storage_configs
WHERE provider = 'onedrive'
AND is_active = true;
```

### Issue: Routing Rules Not Matching

**Check:**
1. Rule is active (`is_active = true`)
2. Subject pattern uses regex correctly
3. Function logs show which rules were evaluated

**Test subject normalization:**
```javascript
// Test in browser console or Node.js
const normalizeSubject = (subject) => {
  if (!subject) return '';
  return subject
    .replace(/^(re|fwd|fw|fwd:re|re:fwd|re:fw|fwd:fw):\s*/gi, '')
    .replace(/^\[.*?\]\s*/g, '')
    .trim();
};

// Test
console.log(normalizeSubject("Re: Document Request"));
// Should output: "Document Request"
```

### Issue: Document Not Linked to Request

**Check:**
1. Document request exists with matching recipient email
2. Request status is 'pending' or 'sent'
3. Email sender matches request recipient exactly (case-insensitive)

**SQL to check:**
```sql
-- Find orphaned documents (no request link)
SELECT 
  d.id,
  d.sender_email,
  d.original_filename,
  d.document_request_id
FROM documents d
WHERE d.document_request_id IS NULL
AND d.sender_email IN (
  SELECT recipient_email FROM document_requests WHERE status IN ('pending', 'sent')
);
```

---

## Step 9: Production Checklist

Before going live, verify:

- [ ] Edge Function deployed successfully
- [ ] Environment variables (especially `ENCRYPTION_KEY`) are set
- [ ] Manual test of function returns success
- [ ] Test email response processed correctly
- [ ] Document appears in correct OneDrive folder
- [ ] Document is linked to request in database
- [ ] Cron job is running (if applicable)
- [ ] Error logs show no critical issues
- [ ] Routing rules are properly configured
- [ ] OneDrive storage config is active and valid

---

## Additional Notes

### Performance Considerations

- The function processes up to 50 emails per account per run
- Processing happens sequentially for each account
- Large attachments may take longer to upload

### Rate Limits

- OneDrive API has rate limits
- Microsoft Graph API: 10,000 requests per 10 minutes per app
- If you hit limits, errors will be logged in function logs

### Monitoring Recommendations

- Set up alerts for function failures
- Monitor cron job execution status
- Track document processing success rate
- Monitor OneDrive storage usage

---

## Support

If you encounter issues:

1. Check function logs first
2. Verify environment variables
3. Test routing rules manually
4. Check database records for anomalies
5. Review this guide for common issues

For debugging, the function logs will show:
- Which emails were processed
- Which routing rules matched
- Any errors during processing
- OneDrive upload results

