-- Diagnostic queries to find why documents aren't being created
-- Run in Supabase SQL Editor

-- 1. Check if there are any documents at all
SELECT COUNT(*) AS total_documents FROM documents;

-- 2. Check email accounts and their sync status
SELECT 
  id,
  email,
  provider,
  is_active,
  last_sync_at,
  created_at
FROM email_accounts
ORDER BY last_sync_at DESC NULLS LAST;

-- 3. Check document requests that should have received documents
SELECT 
  id,
  subject,
  recipient_email,
  status,
  document_count,
  created_at,
  sent_at
FROM document_requests
WHERE recipient_email = 'bullseye.piyush@gmail.com'
  AND status = 'received'
ORDER BY created_at DESC;

-- 4. Check if there are any documents from that sender
SELECT 
  id,
  original_filename,
  sender_email,
  storage_provider,
  upload_verification_status,
  upload_error,
  created_at,
  document_request_id
FROM documents
WHERE sender_email ILIKE '%bullseye.piyush%'
ORDER BY created_at DESC;

-- 5. Check activity logs for any upload attempts
SELECT 
  id,
  action,
  resource_type,
  details,
  created_at
FROM activity_logs
WHERE action IN ('upload', 'upload_failed')
  AND details->>'sender' ILIKE '%bullseye.piyush%'
ORDER BY created_at DESC
LIMIT 20;

-- 6. Check for any errors in activity logs
SELECT 
  id,
  action,
  resource_type,
  details->>'error' AS error,
  details->>'filename' AS filename,
  details->>'category' AS error_category,
  created_at
FROM activity_logs
WHERE action = 'upload_failed'
ORDER BY created_at DESC
LIMIT 20;

-- 7. Check storage configurations
SELECT 
  id,
  name,
  provider,
  is_default,
  is_active,
  updated_at
FROM storage_configs
WHERE is_active = true
ORDER BY is_default DESC, updated_at DESC;

-- 8. Check if emails are being processed but attachments aren't detected
-- This would require checking Edge Function logs in Supabase Dashboard
-- But we can check if there are any recent syncs that might have processed emails
SELECT 
  email,
  provider,
  last_sync_at,
  EXTRACT(EPOCH FROM (NOW() - last_sync_at)) / 60 AS minutes_since_sync
FROM email_accounts
WHERE is_active = true
  AND last_sync_at IS NOT NULL
ORDER BY last_sync_at DESC;

