# Document Validation System - Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Database Migrations
- [ ] Run main validation migration: `20250112000000_add_document_validation_system.sql`
- [ ] Run cron job migration: `20250112000001_add_renewal_reminders_cron_job.sql`
- [ ] Verify tables created: `document_validations`, `document_renewal_reminders`
- [ ] Verify columns added: `documents.validation_status`, `documents.validation_metadata`
- [ ] Verify triggers created: `trigger_create_renewal_reminders`, `trigger_update_document_status`

### 2. Edge Function Deployment
- [ ] Deploy `validate-document` function
- [ ] Deploy `send-renewal-reminders` function
- [ ] Verify functions are accessible

### 3. Environment Configuration
- [ ] Set `OPENAI_API_KEY` in Supabase Dashboard (Edge Functions > Secrets)
- [ ] Verify `ENCRYPTION_KEY` is set
- [ ] Verify `SUPABASE_URL` is set
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is set

### 4. Database Settings for Cron Jobs
- [ ] Verify `app.settings.supabase_url` is configured
- [ ] Verify `app.settings.service_role_key` is configured

### 5. Cron Job Verification
- [ ] Check renewal reminders cron job is scheduled:
  ```sql
  SELECT jobid, jobname, schedule, active 
  FROM cron.job 
  WHERE jobname = 'send-renewal-reminders';
  ```

## 🚀 Deployment Commands

### Step 1: Run Migrations

```bash
# Option A: Using migration script
node run-migration.js supabase/migrations/20250112000000_add_document_validation_system.sql
node run-migration.js supabase/migrations/20250112000001_add_renewal_reminders_cron_job.sql

# Option B: Using Supabase CLI
supabase db push
```

### Step 2: Deploy Edge Functions

```bash
# Deploy validate-document function
supabase functions deploy validate-document

# Deploy send-renewal-reminders function
supabase functions deploy send-renewal-reminders
```

### Step 3: Configure Secrets

1. Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
2. Add or verify:
   - `OPENAI_API_KEY` = Your OpenAI API key
   - `ENCRYPTION_KEY` = Your encryption key (should already exist)
   - `SUPABASE_URL` = Your Supabase project URL (should already exist)
   - `SUPABASE_SERVICE_ROLE_KEY` = Your service role key (should already exist)

### Step 4: Verify Cron Job

```sql
-- Check if cron job exists
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'send-renewal-reminders';

-- If not found, the migration should have created it
-- If still not found, run the cron job migration again
```

## 🧪 Testing After Deployment

### Test 1: Automatic Validation

1. Send a test email with a document attachment
2. Wait for email processing (check logs or wait 5-15 minutes)
3. Navigate to the document in dashboard
4. Check Validation Summary panel shows results
5. Verify validation status is "verified" or "needs_review"

### Test 2: Manual Validation Trigger

1. Navigate to a document detail page
2. Click "Validate Now" or "Re-validate" button
3. Wait 2-5 seconds
4. Check Validation Summary updates with new results

### Test 3: Renewal Reminders

1. Find a document with expiry date in the future
2. Manually trigger validation (if not already validated)
3. Check renewal reminders were created:
   ```sql
   SELECT * FROM document_renewal_reminders 
   WHERE document_id = 'your-document-id';
   ```
4. Manually trigger reminder sending:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/send-renewal-reminders \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
   ```

## 🔍 Verification Queries

### Check Validation Status
```sql
-- View recent validations
SELECT 
  d.id,
  d.original_filename,
  d.validation_status,
  dv.overall_status,
  dv.document_type,
  dv.owner_match_confidence,
  dv.expiry_status,
  dv.days_until_expiry
FROM documents d
LEFT JOIN document_validations dv ON d.id = dv.document_id
ORDER BY d.created_at DESC
LIMIT 10;
```

### Check Renewal Reminders
```sql
-- View upcoming reminders
SELECT 
  drr.*,
  d.original_filename,
  p.email as employee_email
FROM document_renewal_reminders drr
JOIN documents d ON drr.document_id = d.id
LEFT JOIN profiles p ON drr.employee_id = p.id
WHERE drr.email_sent = false
  AND drr.reminder_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY drr.reminder_date;
```

### Check Validation Errors
```sql
-- Documents stuck in validating state
SELECT 
  id,
  original_filename,
  validation_status,
  validation_metadata
FROM documents
WHERE validation_status = 'validating'
  AND updated_at < NOW() - INTERVAL '10 minutes';
```

## 📊 Monitoring

### Key Metrics to Monitor

1. **Validation Success Rate**
   ```sql
   SELECT 
     COUNT(*) as total,
     COUNT(CASE WHEN overall_status = 'verified' THEN 1 END) as verified,
     COUNT(CASE WHEN overall_status = 'needs_review' THEN 1 END) as needs_review,
     COUNT(CASE WHEN overall_status = 'rejected' THEN 1 END) as rejected
   FROM document_validations
   WHERE validated_at > NOW() - INTERVAL '24 hours';
   ```

2. **Auto-Approval Rate**
   ```sql
   SELECT 
     COUNT(*) as total_validated,
     COUNT(CASE WHEN can_auto_approve THEN 1 END) as auto_approved
   FROM document_validations
   WHERE validated_at > NOW() - INTERVAL '24 hours';
   ```

3. **Renewal Reminders Sent**
   ```sql
   SELECT 
     reminder_type,
     COUNT(*) as sent_count
   FROM document_renewal_reminders
   WHERE email_sent = true
     AND sent_at > NOW() - INTERVAL '24 hours'
   GROUP BY reminder_type;
   ```

## 🐛 Troubleshooting

### Issue: Validation Not Triggering

**Check:**
1. Email processing logs in Supabase Dashboard
2. Edge function logs for `validate-document`
3. Document `validation_status` field

**Fix:**
- Manually trigger validation via "Validate Now" button
- Check if `OPENAI_API_KEY` is set correctly
- Verify edge function is deployed

### Issue: OpenAI API Errors

**Check:**
- API key is valid and has credits
- API key is set in Supabase secrets
- Edge function logs for specific error messages

**Fix:**
- Verify API key in OpenAI dashboard
- Check API usage limits
- Ensure key has sufficient credits

### Issue: Renewal Reminders Not Sending

**Check:**
1. Cron job is scheduled and active
2. Reminders exist with `email_sent = false`
3. Reminder dates are in the past or today
4. Email accounts are configured for organization

**Fix:**
- Verify cron job exists and is active
- Manually trigger reminder sending
- Check email account configuration

### Issue: Owner Matching Failing

**Check:**
- Employee profiles exist with correct email addresses
- Sender email matches profile email
- Name matching confidence scores

**Fix:**
- Update employee profiles with correct information
- Check sender email in document metadata
- Review validation_metadata for detailed matching results

## 📝 Post-Deployment

After successful deployment:

1. **Monitor First Few Validations**
   - Check validation accuracy
   - Review auto-approval decisions
   - Adjust thresholds if needed

2. **Configure Auto-Approval Settings**
   - Set organization-specific thresholds
   - Test with various document types

3. **Train Team**
   - Show admin dashboard validation features
   - Explain review queue workflow
   - Document manual validation process

4. **Set Up Alerts** (Optional)
   - Monitor validation errors
   - Track renewal reminder failures
   - Alert on high error rates

---

**Ready for Production**: ✅ Yes, after completing checklist above

