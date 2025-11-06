-- Verification Queries for Status Tracking Migration
-- Run these in Supabase Dashboard SQL Editor to verify migration was successful

-- ============================================================================
-- CHECK 1: Verify Status History Table Exists
-- ============================================================================
SELECT 
    '✅ Status History Table exists' as check_name,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_name = 'document_request_status_history';

-- ============================================================================
-- CHECK 2: Verify Status Summary View Exists
-- ============================================================================
SELECT 
    '✅ Status Summary View exists' as check_name,
    COUNT(*) as view_count
FROM information_schema.views 
WHERE table_name = 'document_request_status_summary';

-- ============================================================================
-- CHECK 3: Verify New Columns in document_requests Table
-- ============================================================================
SELECT 
    '✅ New columns exist' as check_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'document_requests' 
AND column_name IN (
    'document_count',
    'expected_document_count', 
    'last_status_change',
    'status_changed_by'
)
ORDER BY column_name;

-- ============================================================================
-- CHECK 4: Verify Status Constraint Includes 'verifying'
-- ============================================================================
SELECT 
    '✅ Status constraint includes verifying' as check_name,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'document_requests_status_check';

-- ============================================================================
-- CHECK 5: Verify Triggers Exist
-- ============================================================================
SELECT 
    '✅ Triggers created' as check_name,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%document_request%'
ORDER BY trigger_name;

-- ============================================================================
-- CHECK 6: Verify Functions Exist
-- ============================================================================
SELECT 
    '✅ Functions created' as check_name,
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname IN (
    'log_document_request_status_change',
    'update_document_request_count',
    'auto_complete_document_request',
    'trigger_update_document_count'
)
ORDER BY proname;

-- ============================================================================
-- CHECK 7: Verify Indexes Created
-- ============================================================================
SELECT 
    '✅ Indexes created' as check_name,
    indexname,
    tablename
FROM pg_indexes 
WHERE tablename = 'document_request_status_history'
ORDER BY indexname;

-- ============================================================================
-- CHECK 8: Test Status History Table Structure
-- ============================================================================
SELECT 
    '✅ Status History structure' as check_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'document_request_status_history'
ORDER BY ordinal_position;

-- ============================================================================
-- SUMMARY: Count Status History Records (if any exist)
-- ============================================================================
SELECT 
    '📊 Status History Records' as metric,
    COUNT(*) as count
FROM document_request_status_history;

-- ============================================================================
-- SUMMARY: Check Document Requests with New Fields
-- ============================================================================
SELECT 
    '📊 Document Requests Stats' as metric,
    COUNT(*) as total_requests,
    COUNT(document_count) as with_document_count,
    COUNT(expected_document_count) as with_expected_count,
    COUNT(status_changed_by) as with_status_changed_by
FROM document_requests;

-- ============================================================================
-- TEST: Verify Status History Can Be Queried
-- ============================================================================
-- This should return empty result set if no status changes have been made yet
-- If it returns rows, status tracking is working!
SELECT 
    dr.id as request_id,
    dr.recipient_email,
    dr.status as current_status,
    dr.document_count,
    dr.expected_document_count,
    dr.last_status_change,
    COUNT(hist.id) as history_count
FROM document_requests dr
LEFT JOIN document_request_status_history hist ON hist.document_request_id = dr.id
GROUP BY dr.id, dr.recipient_email, dr.status, dr.document_count, dr.expected_document_count, dr.last_status_change
ORDER BY dr.created_at DESC
LIMIT 10;

