-- Migration: Add Document Request Status Tracking
-- Created: 2025-01-06
-- Description: Adds status history tracking and enhanced status management for document requests

-- ============================================================================
-- STATUS HISTORY TABLE
-- ============================================================================
-- Tracks all status changes for document requests with timestamps and details
CREATE TABLE IF NOT EXISTS document_request_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_request_id UUID REFERENCES document_requests(id) ON DELETE CASCADE NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL CHECK (new_status IN ('pending', 'sent', 'received', 'missing_files', 'completed', 'expired', 'verifying')),
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by request
CREATE INDEX IF NOT EXISTS idx_status_history_request_id 
    ON document_request_status_history(document_request_id);

-- Index for status changes
CREATE INDEX IF NOT EXISTS idx_status_history_new_status 
    ON document_request_status_history(new_status);

-- Index for recent changes
CREATE INDEX IF NOT EXISTS idx_status_history_created_at 
    ON document_request_status_history(created_at DESC);

-- ============================================================================
-- ADD STATUS TRACKING FIELDS TO DOCUMENT_REQUESTS
-- ============================================================================
-- Add fields to track document counts and verification status
ALTER TABLE document_requests
    ADD COLUMN IF NOT EXISTS document_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS expected_document_count INTEGER DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS last_status_change TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add 'verifying' status to the CHECK constraint
-- First, drop the existing constraint
ALTER TABLE document_requests
    DROP CONSTRAINT IF EXISTS document_requests_status_check;

-- Add new constraint with 'verifying' status
ALTER TABLE document_requests
    ADD CONSTRAINT document_requests_status_check 
    CHECK (status IN ('pending', 'sent', 'received', 'missing_files', 'completed', 'expired', 'verifying'));

-- ============================================================================
-- FUNCTION: Log Status Change
-- ============================================================================
-- Automatically logs status changes to history table
CREATE OR REPLACE FUNCTION log_document_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO document_request_status_history (
            document_request_id,
            old_status,
            new_status,
            changed_by,
            metadata
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.status_changed_by,
            jsonb_build_object(
                'document_count', NEW.document_count,
                'expected_count', NEW.expected_document_count,
                'completed_at', NEW.completed_at,
                'sent_at', NEW.sent_at
            )
        );

        -- Update last_status_change timestamp
        NEW.last_status_change = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-log Status Changes
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_log_document_request_status_change ON document_requests;

CREATE TRIGGER trigger_log_document_request_status_change
    BEFORE UPDATE ON document_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_document_request_status_change();

-- ============================================================================
-- FUNCTION: Update Document Count
-- ============================================================================
-- Updates document count for a request based on linked documents
CREATE OR REPLACE FUNCTION update_document_request_count(request_id UUID)
RETURNS INTEGER AS $$
DECLARE
    doc_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO doc_count
    FROM documents
    WHERE document_request_id = request_id;

    UPDATE document_requests
    SET document_count = doc_count,
        updated_at = NOW()
    WHERE id = request_id;

    RETURN doc_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-update Document Count
-- ============================================================================
-- Automatically updates document count when documents are inserted/deleted
CREATE OR REPLACE FUNCTION trigger_update_document_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.document_request_id IS NOT NULL THEN
        PERFORM update_document_request_count(NEW.document_request_id);
        
        -- If request is in 'received' status and has documents, mark as verifying
        UPDATE document_requests
        SET status = 'verifying',
            status_changed_by = NULL, -- System change
            updated_at = NOW()
        WHERE id = NEW.document_request_id
          AND status = 'received'
          AND document_count > 0;
    ELSIF TG_OP = 'DELETE' AND OLD.document_request_id IS NOT NULL THEN
        PERFORM update_document_request_count(OLD.document_request_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_update_document_count ON documents;

CREATE TRIGGER trigger_auto_update_document_count
    AFTER INSERT OR DELETE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_document_count();

-- ============================================================================
-- FUNCTION: Auto-complete Request
-- ============================================================================
-- Automatically marks request as completed when expected documents are received
CREATE OR REPLACE FUNCTION auto_complete_document_request(request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    req RECORD;
BEGIN
    SELECT 
        document_count,
        expected_document_count,
        status
    INTO req
    FROM document_requests
    WHERE id = request_id;

    -- Only auto-complete if:
    -- 1. Expected count is set and matches actual count
    -- 2. Status is 'verifying' or 'received'
    -- 3. Not already completed
    IF req.expected_document_count IS NOT NULL 
       AND req.document_count >= req.expected_document_count
       AND req.status IN ('received', 'verifying')
       AND req.status != 'completed' THEN
        
        UPDATE document_requests
        SET status = 'completed',
            completed_at = NOW(),
            status_changed_by = NULL, -- System change
            updated_at = NOW()
        WHERE id = request_id;

        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEW: Document Request Status Summary
-- ============================================================================
-- Provides a summary view of request statuses with document counts
CREATE OR REPLACE VIEW document_request_status_summary AS
SELECT 
    dr.id,
    dr.organization_id,
    dr.recipient_email,
    dr.subject,
    dr.status,
    dr.document_count,
    dr.expected_document_count,
    dr.sent_at,
    dr.completed_at,
    dr.due_date,
    dr.last_status_change,
    CASE 
        WHEN dr.expected_document_count IS NOT NULL 
        THEN dr.document_count >= dr.expected_document_count
        ELSE NULL
    END as all_documents_received,
    (
        SELECT COUNT(*) 
        FROM document_request_status_history 
        WHERE document_request_id = dr.id
    ) as status_change_count,
    (
        SELECT new_status 
        FROM document_request_status_history 
        WHERE document_request_id = dr.id 
        ORDER BY created_at DESC 
        LIMIT 1
    ) as last_status,
    (
        SELECT created_at 
        FROM document_request_status_history 
        WHERE document_request_id = dr.id 
        ORDER BY created_at DESC 
        LIMIT 1
    ) as last_status_change_time
FROM document_requests dr;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE document_request_status_history IS 'Tracks all status changes for document requests with full audit trail';
COMMENT ON FUNCTION log_document_request_status_change() IS 'Automatically logs status changes when document request status is updated';
COMMENT ON FUNCTION update_document_request_count(UUID) IS 'Updates the document count for a specific request';
COMMENT ON FUNCTION auto_complete_document_request(UUID) IS 'Automatically marks request as completed when expected documents are received';
COMMENT ON VIEW document_request_status_summary IS 'Summary view of document requests with status tracking information';

