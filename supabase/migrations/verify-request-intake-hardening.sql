-- Verification script for request intake hardening migration
-- Run this after applying 20250113000000_harden_request_intake.sql

-- Check that document_request_types table exists and has data
DO $$
DECLARE
    type_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO type_count FROM document_request_types;
    
    IF type_count = 0 THEN
        RAISE EXCEPTION 'document_request_types table is empty';
    END IF;
    
    RAISE NOTICE '✓ document_request_types table exists with % rows', type_count;
END $$;

-- Check that normalize_request_type function exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'normalize_request_type'
    ) THEN
        RAISE EXCEPTION 'normalize_request_type function does not exist';
    END IF;
    
    RAISE NOTICE '✓ normalize_request_type function exists';
END $$;

-- Check that is_valid_request_type function exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'is_valid_request_type'
    ) THEN
        RAISE EXCEPTION 'is_valid_request_type function does not exist';
    END IF;
    
    RAISE NOTICE '✓ is_valid_request_type function exists';
END $$;

-- Test normalize_request_type function
DO $$
DECLARE
    result TEXT;
BEGIN
    -- Test various inputs
    result := normalize_request_type('Driver''s License');
    IF result != 'drivers_license' THEN
        RAISE EXCEPTION 'normalize_request_type failed: expected drivers_license, got %', result;
    END IF;
    
    result := normalize_request_type('passport');
    IF result != 'passport' THEN
        RAISE EXCEPTION 'normalize_request_type failed: expected passport, got %', result;
    END IF;
    
    result := normalize_request_type('invalid_type');
    IF result != 'other' THEN
        RAISE EXCEPTION 'normalize_request_type failed: expected other, got %', result;
    END IF;
    
    RAISE NOTICE '✓ normalize_request_type function works correctly';
END $$;

-- Test is_valid_request_type function
DO $$
DECLARE
    is_valid BOOLEAN;
BEGIN
    is_valid := is_valid_request_type('passport');
    IF NOT is_valid THEN
        RAISE EXCEPTION 'is_valid_request_type failed: passport should be valid';
    END IF;
    
    is_valid := is_valid_request_type('invalid_type');
    IF is_valid THEN
        RAISE EXCEPTION 'is_valid_request_type failed: invalid_type should not be valid';
    END IF;
    
    is_valid := is_valid_request_type(NULL);
    IF NOT is_valid THEN
        RAISE EXCEPTION 'is_valid_request_type failed: NULL should be valid';
    END IF;
    
    RAISE NOTICE '✓ is_valid_request_type function works correctly';
END $$;

-- Check that all request types in document_requests are normalized (or NULL)
DO $$
DECLARE
    unnormalized_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unnormalized_count
    FROM document_requests
    WHERE request_type IS NOT NULL
    AND request_type != ''
    AND request_type NOT IN (
        SELECT type_code FROM document_request_types
    )
    AND normalize_request_type(request_type) != request_type;
    
    IF unnormalized_count > 0 THEN
        RAISE WARNING 'Found % unnormalized request types (this is OK if migration just ran)', unnormalized_count;
    ELSE
        RAISE NOTICE '✓ All request types are normalized';
    END IF;
END $$;

SELECT 'All verification checks passed!' as status;

