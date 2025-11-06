-- Quick Status Check for Document Validation System
-- Run this in Supabase SQL Editor to check current state

-- ============================================================================
-- 1. Check Database Schema (Tables and Columns)
-- ============================================================================

-- Check documents table has validation columns
SELECT 
  '✅ documents.validation_status' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM information_schema.columns 
WHERE table_name = 'documents' 
  AND column_name = 'validation_status';

SELECT 
  '✅ documents.validation_metadata' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM information_schema.columns 
WHERE table_name = 'documents' 
  AND column_name = 'validation_metadata';

-- Check document_validations table exists
SELECT 
  '✅ document_validations table' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM information_schema.tables 
WHERE table_name = 'document_validations';

-- Check document_renewal_reminders table exists
SELECT 
  '✅ document_renewal_reminders table' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM information_schema.tables 
WHERE table_name = 'document_renewal_reminders';

-- ============================================================================
-- 2. Check Cron Job for Renewal Reminders
-- ============================================================================

SELECT 
  '✅ send-renewal-reminders cron job' as check_name,
  jobid,
  jobname,
  schedule,
  CASE 
    WHEN active THEN 'ACTIVE'
    ELSE 'INACTIVE'
  END as status
FROM cron.job 
WHERE jobname = 'send-renewal-reminders';

-- ============================================================================
-- 3. Check Recent Validation Results (if any)
-- ============================================================================

SELECT 
  'Recent validations' as check_name,
  COUNT(*) as total_validations,
  COUNT(*) FILTER (WHERE overall_status = 'verified') as verified_count,
  COUNT(*) FILTER (WHERE overall_status = 'needs_review') as needs_review_count,
  COUNT(*) FILTER (WHERE overall_status = 'rejected') as rejected_count
FROM document_validations
WHERE created_at > NOW() - INTERVAL '7 days';

-- ============================================================================
-- 4. Check Renewal Reminders Created
-- ============================================================================

SELECT 
  'Renewal reminders' as check_name,
  COUNT(*) as total_reminders,
  COUNT(*) FILTER (WHERE email_sent = false) as pending_reminders,
  COUNT(*) FILTER (WHERE email_sent = true) as sent_reminders,
  COUNT(*) FILTER (WHERE reminder_date <= CURRENT_DATE AND email_sent = false) as overdue_reminders
FROM document_renewal_reminders;

-- ============================================================================
-- Summary
-- ============================================================================
-- If all checks show "EXISTS" and cron job shows "ACTIVE", you're ready!
-- Next steps:
-- 1. Deploy Edge Functions: ./deploy-validation-functions.sh
-- 2. Set OPENAI_API_KEY in Supabase Dashboard → Edge Functions → Secrets
-- 3. Test validation on a document

