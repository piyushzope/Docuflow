-- Migration: Add Scheduled Send and Document Requirements Support
-- Created: 2025-01-11
-- Description:
--   1. Adds scheduled_send_at column for scheduling email sends
--   2. Adds required_document_types JSONB column for document requirements

-- ============================================================================
-- ADD SCHEDULED SEND COLUMN
-- ============================================================================
ALTER TABLE document_requests
ADD COLUMN IF NOT EXISTS scheduled_send_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for querying scheduled sends
CREATE INDEX IF NOT EXISTS idx_document_requests_scheduled_send 
ON document_requests(scheduled_send_at) 
WHERE scheduled_send_at IS NOT NULL;

-- ============================================================================
-- ADD DOCUMENT REQUIREMENTS COLUMN
-- ============================================================================
ALTER TABLE document_requests
ADD COLUMN IF NOT EXISTS required_document_types JSONB DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN document_requests.required_document_types IS 
'Array of document requirement objects: [{"type": "string", "required": boolean, "fileTypes": ["PDF", "JPG"]}]';

-- Add index for querying by document types
CREATE INDEX IF NOT EXISTS idx_document_requests_required_types 
ON document_requests USING GIN (required_document_types);

