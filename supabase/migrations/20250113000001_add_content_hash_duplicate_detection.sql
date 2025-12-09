-- Migration: Add Content Hash and Duplicate Detection
-- Created: 2025-01-13
-- Description: 
--   1. Adds content_hash column to documents table for duplicate detection
--   2. Adds index for efficient duplicate lookups
--   3. All changes are idempotent and non-breaking

-- ============================================================================
-- ADD CONTENT_HASH COLUMN
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'content_hash'
  ) THEN
    ALTER TABLE documents 
    ADD COLUMN content_hash TEXT;
    
    RAISE NOTICE 'Added content_hash column to documents table';
  ELSE
    RAISE NOTICE 'content_hash column already exists';
  END IF;
END $$;

-- ============================================================================
-- ADD INDEX FOR DUPLICATE DETECTION
-- ============================================================================
-- Index for efficient duplicate lookups within an organization
CREATE INDEX IF NOT EXISTS idx_documents_content_hash_org 
ON documents(organization_id, content_hash) 
WHERE content_hash IS NOT NULL;

-- ============================================================================
-- ADD COMMENT
-- ============================================================================
COMMENT ON COLUMN documents.content_hash IS 
'SHA-256 hash of document content for duplicate detection. Computed during validation.';

-- ============================================================================
-- HELPER FUNCTION TO FIND DUPLICATES
-- ============================================================================
CREATE OR REPLACE FUNCTION find_duplicate_documents(
  p_organization_id UUID,
  p_content_hash TEXT,
  p_exclude_document_id UUID DEFAULT NULL
)
RETURNS TABLE (
  document_id UUID,
  original_filename TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.original_filename,
    d.created_at
  FROM documents d
  WHERE d.organization_id = p_organization_id
    AND d.content_hash = p_content_hash
    AND d.content_hash IS NOT NULL
    AND (p_exclude_document_id IS NULL OR d.id != p_exclude_document_id)
  ORDER BY d.created_at ASC;
END;
$$;

COMMENT ON FUNCTION find_duplicate_documents IS 
'Finds documents with the same content hash within an organization, optionally excluding a specific document';

