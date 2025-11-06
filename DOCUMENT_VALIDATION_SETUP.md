# Document Validation System - Setup Guide

## Overview

This document describes the AI-powered document validation system that automatically validates documents received via email, including:
- Document type classification
- Owner identity matching
- Expiry date detection
- Authenticity checks
- Request compliance verification
- Automatic renewal reminders

## Implementation Status

✅ **Completed:**
- Database schema (document_validations, document_renewal_reminders tables)
- Validate-document edge function with full AI validation logic
- Email processing integration (auto-triggers validation)
- Admin dashboard component (DocumentValidationSummary)
- Renewal reminders edge function
- API routes for validation data

## Setup Steps

### 1. Run Database Migrations

Run the validation system migration:

```bash
# Using the migration script
node run-migration.js supabase/migrations/20250112000000_add_document_validation_system.sql

# Or using Supabase CLI
supabase db push
```

Then add the renewal reminders cron job:

```bash
node run-migration.js supabase/migrations/20250112000001_add_renewal_reminders_cron_job.sql
```

### 2. Deploy Edge Functions

Deploy the new edge functions:

```bash
# Deploy validate-document function
supabase functions deploy validate-document

# Deploy send-renewal-reminders function (if not already deployed)
supabase functions deploy send-renewal-reminders
```

### 3. Configure Environment Variables

Set the following secrets in Supabase Dashboard (Project Settings > Edge Functions > Secrets):

- **OPENAI_API_KEY** (required): Your OpenAI API key for document classification
  - Get one from: https://platform.openai.com/api-keys
  - Used for: Document type classification, data extraction

- **ENCRYPTION_KEY** (should already be set): Encryption key for tokens
- **SUPABASE_URL** (should already be set): Your Supabase project URL
- **SUPABASE_SERVICE_ROLE_KEY** (should already be set): Service role key

### 4. Verify Database Settings for Cron Jobs

Ensure these database settings are configured (for cron jobs):

```sql
-- Check if settings exist
SELECT name, setting FROM pg_settings 
WHERE name IN ('app.settings.supabase_url', 'app.settings.service_role_key');

-- If not set, configure via Supabase Dashboard:
-- Project Settings > Database > Custom Database Settings
-- Or set via SQL (less secure):
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
```

### 5. Verify Cron Jobs

Check that the renewal reminders cron job is scheduled:

```sql
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'send-renewal-reminders';
```

Expected result:
- `jobname`: `send-renewal-reminders`
- `schedule`: `0 9 * * *` (daily at 9 AM)
- `active`: `true`

### 6. Configure Auto-Approval Settings (Optional)

Customize auto-approval thresholds per organization:

```sql
-- Update organization settings
UPDATE organizations
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{auto_approval}',
  '{
    "enabled": true,
    "min_owner_match_confidence": 0.90,
    "min_authenticity_score": 0.85,
    "require_expiry_check": true,
    "allow_expired_documents": false,
    "min_request_compliance_score": 0.95
  }'::jsonb
)
WHERE id = 'your-organization-id';
```

## How It Works

### 1. Document Receipt Flow

1. **Email arrives** → Processed by `process-emails` function
2. **Document uploaded** → Stored in OneDrive/Google Drive/Supabase
3. **Document record created** → Status: `received`
4. **Validation triggered** → Calls `validate-document` function (async, non-blocking)
5. **Validation completes** → Results stored in `document_validations` table

### 2. Validation Process

The `validate-document` function:

1. **Downloads document** from storage (OneDrive/Google Drive/Supabase)
2. **Extracts text** (placeholder - OCR integration TODO)
3. **Classifies document** using OpenAI GPT-4o-mini:
   - Document type (passport, driver's license, etc.)
   - Expiry date
   - Issue date
   - Document number
   - Name on document
4. **Matches owner identity**:
   - Exact email match (primary)
   - Fuzzy name matching (fallback)
   - DOB matching (if available)
5. **Analyzes expiry**:
   - Calculates days until expiry
   - Sets expiry status (expired/expiring_soon/expiring_later)
   - Creates renewal reminders (via trigger)
6. **Checks authenticity**:
   - PDF validity
   - Duplicate detection
   - Quality scores
7. **Verifies request compliance**:
   - Matches document type to request type
   - Checks completeness
8. **Makes auto-approval decision**:
   - Based on confidence scores
   - Updates document status accordingly

### 3. Renewal Reminders

- **Triggered automatically** when validation detects expiry date
- **Scheduled reminders** at 90, 60, 30 days before expiry and on expiry
- **Sent via email** using organization's configured email account
- **Run daily** at 9 AM via cron job

### 4. Admin Dashboard

Admins can view validation results on the document detail page:

- **Validation Summary Panel** shows:
  - Overall status (Verified/Needs Review/Rejected)
  - Document type and confidence
  - Owner match confidence
  - Expiry status and countdown
  - Authenticity score
  - Request compliance
  - Critical issues and warnings

## Testing

### Test Document Validation

1. **Send a test email** with a document attachment
2. **Wait for processing** (check email processing logs)
3. **View document** in dashboard
4. **Check validation results** in the Validation Summary panel

### Test Renewal Reminders

1. **Create a test document** with expiry date in the future
2. **Manually trigger validation**:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/validate-document \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"documentId": "your-document-id"}'
   ```
3. **Check renewal reminders** were created:
   ```sql
   SELECT * FROM document_renewal_reminders 
   WHERE document_id = 'your-document-id';
   ```
4. **Manually trigger reminder sending**:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/send-renewal-reminders \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
   ```

## Troubleshooting

### Validation Not Triggering

1. Check email processing logs:
   ```sql
   SELECT * FROM activity_logs 
   WHERE action = 'upload' 
   ORDER BY created_at DESC LIMIT 10;
   ```

2. Check document validation_status:
   ```sql
   SELECT id, validation_status, validation_metadata 
   FROM documents 
   WHERE validation_status = 'validating' 
   ORDER BY created_at DESC;
   ```

3. Check edge function logs in Supabase Dashboard

### OpenAI API Errors

- Verify `OPENAI_API_KEY` is set correctly
- Check API key has sufficient credits
- Review OpenAI API usage dashboard

### Renewal Reminders Not Sending

1. Check cron job is active:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'send-renewal-reminders';
   ```

2. Check recent executions:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-renewal-reminders')
   ORDER BY start_time DESC LIMIT 5;
   ```

3. Check for unsent reminders:
   ```sql
   SELECT * FROM document_renewal_reminders 
   WHERE email_sent = false 
   AND reminder_date <= CURRENT_DATE;
   ```

## Cost Considerations

- **OpenAI API**: GPT-4o-mini costs ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **Estimated cost per document**: ~$0.001-0.005 (depending on document size)
- **Recommendation**: Monitor usage and consider caching for similar documents

## Future Enhancements

- [ ] Integrate OCR (Google Vision API or Azure Computer Vision) for scanned documents
- [ ] Enhanced PDF text extraction for native PDFs
- [ ] MRZ/QR code parsing for passports/IDs
- [ ] Digital signature verification
- [ ] Image quality analysis (blur detection, resolution check)
- [ ] Duplicate detection using content hashing
- [ ] Bulk validation API endpoint
- [ ] Validation webhooks for external systems

## Support

For issues or questions:
1. Check edge function logs in Supabase Dashboard
2. Review database activity logs
3. Check cron job execution history
4. Review validation metadata for detailed error information

