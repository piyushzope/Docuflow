-- Query to check processed emails and related data
-- Run in Supabase SQL Editor

-- 1. Check email accounts and their last sync times
SELECT 
  id,
  email,
  provider,
  is_active,
  last_sync_at,
  created_at,
  updated_at
FROM email_accounts
ORDER BY last_sync_at DESC NULLS LAST;

-- 2. Check recent documents created from emails
SELECT 
  id,
  original_filename,
  sender_email,
  storage_provider,
  storage_path,
  upload_verification_status,
  upload_error,
  upload_verified_at,
  created_at,
  email_account_id,
  document_request_id
FROM documents
ORDER BY created_at DESC
LIMIT 20;

-- 3. Check activity logs for email processing
SELECT 
  id,
  action,
  resource_type,
  details,
  user_id,
  created_at
FROM activity_logs
WHERE action IN ('upload', 'upload_failed', 'verify_upload')
ORDER BY created_at DESC
LIMIT 20;

-- 4. Check for documents with upload errors
SELECT 
  id,
  original_filename,
  sender_email,
  storage_provider,
  upload_verification_status,
  upload_error,
  created_at
FROM documents
WHERE upload_error IS NOT NULL 
   OR upload_verification_status IN ('failed', 'not_found')
ORDER BY created_at DESC;

-- 5. Check email processing summary (last 24 hours)
SELECT 
  COUNT(*) AS total_documents,
  COUNT(*) FILTER (WHERE upload_verification_status = 'verified') AS verified,
  COUNT(*) FILTER (WHERE upload_verification_status = 'pending') AS pending,
  COUNT(*) FILTER (WHERE upload_verification_status = 'failed') AS failed,
  COUNT(*) FILTER (WHERE upload_verification_status = 'not_found') AS not_found,
  COUNT(*) FILTER (WHERE upload_error IS NOT NULL) AS with_errors
FROM documents
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- 6. Check documents by storage provider
SELECT 
  storage_provider,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE upload_verification_status = 'verified') AS verified,
  COUNT(*) FILTER (WHERE upload_verification_status = 'failed') AS failed,
  COUNT(*) FILTER (WHERE upload_error IS NOT NULL) AS with_errors
FROM documents
GROUP BY storage_provider
ORDER BY total DESC;

-- 7. Check recent email account sync activity
SELECT 
  ea.email,
  ea.provider,
  ea.last_sync_at,
  COUNT(d.id) AS documents_created,
  MAX(d.created_at) AS latest_document
FROM email_accounts ea
LEFT JOIN documents d ON d.email_account_id = ea.id
WHERE ea.is_active = true
GROUP BY ea.id, ea.email, ea.provider, ea.last_sync_at
ORDER BY ea.last_sync_at DESC;

-- 8. Check activity logs with detailed error information
SELECT 
  al.id,
  al.action,
  al.resource_type,
  al.details->>'filename' AS filename,
  al.details->>'error' AS error,
  al.details->>'category' AS error_category,
  al.details->>'provider' AS storage_provider,
  al.details->>'document_id' AS document_id,
  al.created_at
FROM activity_logs al
WHERE al.action = 'upload_failed'
ORDER BY al.created_at DESC
LIMIT 20;

-- 9. Check document requests that might have received responses
SELECT 
  dr.id,
  dr.subject,
  dr.recipient_email,
  dr.status,
  dr.document_count,
  COUNT(d.id) AS actual_documents,
  MAX(d.created_at) AS latest_document_received
FROM document_requests dr
LEFT JOIN documents d ON d.document_request_id = dr.id
WHERE dr.status IN ('pending', 'sent', 'received', 'verifying')
GROUP BY dr.id, dr.subject, dr.recipient_email, dr.status, dr.document_count
HAVING COUNT(d.id) > 0 OR dr.status IN ('received', 'verifying')
ORDER BY latest_document_received DESC NULLS LAST
LIMIT 20;

