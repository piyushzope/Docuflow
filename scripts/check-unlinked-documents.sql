-- Check for documents that might be unlinked from requests
-- Run in Supabase SQL Editor

-- 1. Check documents without request links that might match requests
SELECT 
  d.id,
  d.original_filename,
  d.sender_email,
  d.created_at,
  d.metadata->>'email_subject' AS email_subject,
  dr.id AS possible_request_id,
  dr.subject AS request_subject,
  dr.recipient_email,
  dr.status AS request_status
FROM documents d
LEFT JOIN document_requests dr ON 
  dr.recipient_email ILIKE d.sender_email
  AND (
    -- Match by normalized subject
    LOWER(REGEXP_REPLACE(d.metadata->>'email_subject', '^(re|fwd|fw|fwd:re|re:fwd|re:fw|fwd:fw):\s*', '', 'gi')) 
    LIKE '%' || LOWER(REGEXP_REPLACE(dr.subject, '^(re|fwd|fw|fwd:re|re:fwd|re:fw|fwd:fw):\s*', '', 'gi')) || '%'
    OR
    LOWER(REGEXP_REPLACE(dr.subject, '^(re|fwd|fw|fwd:re|re:fwd|re:fw|fwd:fw):\s*', '', 'gi'))
    LIKE '%' || LOWER(REGEXP_REPLACE(d.metadata->>'email_subject', '^(re|fwd|fw|fwd:re|re:fwd|re:fw|fwd:fw):\s*', '', 'gi')) || '%'
  )
WHERE d.document_request_id IS NULL
  AND d.metadata->>'email_subject' IS NOT NULL
ORDER BY d.created_at DESC
LIMIT 20;

-- 2. Check requests that have status 'received' but no documents
SELECT 
  dr.id,
  dr.subject,
  dr.recipient_email,
  dr.status,
  dr.document_count,
  COUNT(d.id) AS actual_document_count
FROM document_requests dr
LEFT JOIN documents d ON d.document_request_id = dr.id
WHERE dr.status = 'received'
  AND (dr.document_count = 0 OR dr.document_count IS NULL)
GROUP BY dr.id, dr.subject, dr.recipient_email, dr.status, dr.document_count
HAVING COUNT(d.id) = 0
ORDER BY dr.created_at DESC;

-- 3. Check for documents from same sender as requests
SELECT 
  d.id AS document_id,
  d.original_filename,
  d.sender_email,
  d.created_at AS document_created,
  dr.id AS request_id,
  dr.subject AS request_subject,
  dr.recipient_email,
  dr.status,
  dr.created_at AS request_created
FROM documents d
CROSS JOIN document_requests dr
WHERE d.document_request_id IS NULL
  AND d.sender_email ILIKE dr.recipient_email
  AND dr.status IN ('pending', 'sent', 'received', 'verifying')
  AND d.created_at >= dr.created_at
ORDER BY d.created_at DESC
LIMIT 20;

