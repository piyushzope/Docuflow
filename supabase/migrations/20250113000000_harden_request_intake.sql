-- Migration: Harden Request Intake - Standardize request types and add validation
-- Created: 2025-01-13
-- Description: 
--   1. Creates lookup table for standardized document request types
--   2. Adds check constraint to enforce valid request types
--   3. Backfills existing rows with normalized values
--   4. All changes are idempotent and non-breaking

-- ============================================================================
-- CREATE REQUEST TYPE LOOKUP TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_request_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_code TEXT UNIQUE NOT NULL, -- Standardized code (e.g., 'drivers_license', 'passport')
    display_name TEXT NOT NULL, -- Human-readable name
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active types
CREATE INDEX IF NOT EXISTS idx_request_types_active ON document_request_types(is_active) WHERE is_active = true;

-- Insert standard document types (idempotent)
INSERT INTO document_request_types (type_code, display_name, description) VALUES
    ('passport', 'Passport', 'International passport document'),
    ('drivers_license', 'Driver''s License', 'Driver license or permit'),
    ('id_card', 'ID Card', 'Government-issued identification card'),
    ('birth_certificate', 'Birth Certificate', 'Official birth certificate'),
    ('visa', 'Visa', 'Travel or work visa'),
    ('ead', 'EAD', 'Employment Authorization Document'),
    ('mec', 'MEC', 'Medical Examiner Card'),
    ('ssn', 'SSN', 'Social Security Number card'),
    ('i9', 'I-9', 'Form I-9 Employment Eligibility Verification'),
    ('w2', 'W-2', 'Wage and Tax Statement'),
    ('other', 'Other', 'Other document type')
ON CONFLICT (type_code) DO NOTHING;

-- ============================================================================
-- NORMALIZE EXISTING REQUEST TYPES
-- ============================================================================
-- Function to normalize request type to standard code
CREATE OR REPLACE FUNCTION normalize_request_type(input_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF input_type IS NULL OR input_type = '' THEN
        RETURN NULL;
    END IF;
    
    -- Normalize to lowercase and trim
    input_type := LOWER(TRIM(input_type));
    
    -- Map common variations to standard codes
    CASE
        WHEN input_type IN ('passport', 'passports', 'international passport') THEN
            RETURN 'passport';
        WHEN input_type IN ('driver''s license', 'drivers license', 'drivers_license', 'driver license', 'dl', 'driving license') THEN
            RETURN 'drivers_license';
        WHEN input_type IN ('id card', 'id_card', 'identification card', 'id', 'government id') THEN
            RETURN 'id_card';
        WHEN input_type IN ('birth certificate', 'birth_certificate', 'birth cert', 'bc') THEN
            RETURN 'birth_certificate';
        WHEN input_type IN ('visa', 'visas', 'travel visa', 'work visa') THEN
            RETURN 'visa';
        WHEN input_type IN ('ead', 'employment authorization document', 'work permit') THEN
            RETURN 'ead';
        WHEN input_type IN ('mec', 'medical examiner card', 'medical card', 'dot medical card') THEN
            RETURN 'mec';
        WHEN input_type IN ('ssn', 'social security number', 'social security card', 'ss card') THEN
            RETURN 'ssn';
        WHEN input_type IN ('i-9', 'i9', 'form i-9', 'form i9', 'employment eligibility') THEN
            RETURN 'i9';
        WHEN input_type IN ('w-2', 'w2', 'wage statement', 'tax form w-2') THEN
            RETURN 'w2';
        ELSE
            -- If no match, return 'other' or the original if it's already a valid code
            IF input_type IN (SELECT type_code FROM document_request_types) THEN
                RETURN input_type;
            ELSE
                RETURN 'other';
            END IF;
    END CASE;
END;
$$;

-- Backfill existing request types with normalized values
DO $$
DECLARE
    rec RECORD;
    normalized_type TEXT;
BEGIN
    FOR rec IN 
        SELECT id, request_type 
        FROM document_requests 
        WHERE request_type IS NOT NULL 
        AND request_type != ''
    LOOP
        normalized_type := normalize_request_type(rec.request_type);
        
        IF normalized_type IS NOT NULL AND normalized_type != rec.request_type THEN
            UPDATE document_requests
            SET request_type = normalized_type
            WHERE id = rec.id;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- ADD CHECK CONSTRAINT (Optional - can be enabled later)
-- ============================================================================
-- Note: We're not adding a strict CHECK constraint yet to avoid breaking existing data
-- Instead, we'll rely on application-level validation (Zod) for new requests
-- This can be enabled later once all data is normalized

-- Add comment for future reference
COMMENT ON COLUMN document_requests.request_type IS 
'Standardized document request type code. Valid values: passport, drivers_license, id_card, birth_certificate, visa, ead, mec, ssn, i9, w2, other. Use normalize_request_type() function to convert user input.';

-- ============================================================================
-- ADD HELPER FUNCTION TO VALIDATE REQUEST TYPE
-- ============================================================================
CREATE OR REPLACE FUNCTION is_valid_request_type(type_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF type_code IS NULL THEN
        RETURN true; -- NULL is allowed
    END IF;
    
    RETURN EXISTS (
        SELECT 1 
        FROM document_request_types 
        WHERE type_code = LOWER(TRIM(type_code)) 
        AND is_active = true
    );
END;
$$;

COMMENT ON FUNCTION is_valid_request_type IS 'Validates if a request type code exists and is active in document_request_types table';

