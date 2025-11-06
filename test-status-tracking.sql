-- Test Status Tracking Functionality
-- Run these queries to test that status tracking is working

-- ============================================================================
-- TEST 1: Create a Test Document Request (if needed)
-- ============================================================================
-- First, get your organization_id and user_id
-- Then uncomment and modify this:
/*
INSERT INTO document_requests (
    organization_id,
    recipient_email,
    subject,
    message_body,
    status,
    expected_document_count,
    created_by,
    status_changed_by
) VALUES (
    'your-org-id-here'::uuid,
    'test@example.com',
    'Test Request',
    'This is a test request',
    'pending',
    2, -- Expected 2 documents
    'your-user-id-here'::uuid,
    'your-user-id-here'::uuid
) RETURNING id;
*/

-- ============================================================================
-- TEST 2: Update Status and Watch History
-- ============================================================================
-- Replace 'request-id-here' with an actual request ID
-- Uncomment and run:
/*
UPDATE document_requests
SET 
    status = 'sent',
    status_changed_by = 'your-user-id-here'::uuid
WHERE id = 'request-id-here'::uuid;

-- Check status history
SELECT * 
FROM document_request_status_history 
WHERE document_request_id = 'request-id-here'::uuid
ORDER BY created_at DESC;
*/

-- ============================================================================
-- TEST 3: Test Document Count Update
-- ============================================================================
-- Link a document to a request and watch count update
-- Uncomment and modify:
/*
INSERT INTO documents (
    organization_id,
    document_request_id,
    sender_email,
    original_filename,
    storage_path,
    storage_provider,
    status
) VALUES (
    'your-org-id-here'::uuid,
    'request-id-here'::uuid,
    'sender@example.com',
    'test-document.pdf',
    '/path/to/file',
    'onedrive',
    'received'
);

-- Check if document count was updated
SELECT 
    id,
    recipient_email,
    status,
    document_count,
    expected_document_count,
    last_status_change
FROM document_requests
WHERE id = 'request-id-here'::uuid;
*/

-- ============================================================================
-- TEST 4: View Status Summary
-- ============================================================================
SELECT *
FROM document_request_status_summary
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- TEST 5: Check All Status Changes for a Request
-- ============================================================================
-- Replace 'request-id-here' with actual request ID
SELECT 
    hist.old_status,
    hist.new_status,
    hist.changed_by,
    p.email as changed_by_email,
    hist.created_at,
    hist.metadata
FROM document_request_status_history hist
LEFT JOIN profiles p ON p.id = hist.changed_by
WHERE hist.document_request_id = 'request-id-here'::uuid
ORDER BY hist.created_at DESC;

-- ============================================================================
-- TEST 6: Find Requests Needing Attention
-- ============================================================================
SELECT 
    id,
    recipient_email,
    subject,
    status,
    document_count,
    expected_document_count,
    CASE 
        WHEN expected_document_count IS NULL THEN 'No expected count set'
        WHEN document_count < expected_document_count THEN CONCAT('Missing ', expected_document_count - document_count, ' document(s)')
        WHEN document_count >= expected_document_count THEN 'All documents received'
    END as status_note
FROM document_requests
WHERE status IN ('received', 'verifying')
ORDER BY due_date ASC NULLS LAST
LIMIT 20;

