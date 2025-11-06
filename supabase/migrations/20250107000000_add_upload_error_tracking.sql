-- Migration: Add Upload Error Tracking to Documents Table
-- Created: 2025-01-07
-- Description: Adds columns to track upload errors, verification status, and verification timestamps

-- Add upload error tracking columns
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS upload_error TEXT,
ADD COLUMN IF NOT EXISTS upload_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS upload_verification_status TEXT CHECK (upload_verification_status IN ('pending', 'verified', 'failed', 'not_found'));

-- Create index for querying documents with upload issues
CREATE INDEX IF NOT EXISTS idx_documents_upload_errors ON documents(upload_verification_status, upload_error)
WHERE upload_error IS NOT NULL OR upload_verification_status IN ('failed', 'not_found');

-- Create index for verification status queries
CREATE INDEX IF NOT EXISTS idx_documents_verification_status ON documents(upload_verification_status, upload_verified_at)
WHERE upload_verification_status IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN documents.upload_error IS 'Error message if upload failed';
COMMENT ON COLUMN documents.upload_verified_at IS 'Timestamp when upload verification was last performed';
COMMENT ON COLUMN documents.upload_verification_status IS 'Status of upload verification: pending, verified, failed, or not_found';

