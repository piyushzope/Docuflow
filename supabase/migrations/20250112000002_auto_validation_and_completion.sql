-- Migration: Automatic Validation and Completion
-- Created: 2025-01-12
-- Description: Automatically triggers validation when documents enter verification phase
--              and marks document requests as completed when all documents pass validation

-- Enable pg_net extension if not already enabled (required for HTTP calls)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- FUNCTION: Trigger Validation on Verification Phase
-- ============================================================================
-- Triggers validation for documents when they enter the verification phase
-- This function is called:
-- 1. When a document_request status changes to 'verifying' → validate all linked documents
-- 2. When a document is inserted with document_request_id where status is 'verifying' → validate new document
CREATE OR REPLACE FUNCTION trigger_validation_on_verification()
RETURNS TRIGGER AS $$
DECLARE
  doc_record RECORD;
  supabase_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
BEGIN
  -- Get Supabase URL and service role key from settings
  -- These should be set via: ALTER DATABASE postgres SET app.settings.supabase_url = '...';
  -- Or use Supabase secrets API in production
  BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_role_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    -- If settings are not available, log and return (non-blocking)
    RAISE WARNING 'Cannot trigger validation: Supabase URL or service role key not configured';
    RETURN COALESCE(NEW, OLD);
  END;

  -- Case 1: document_request status changed to 'verifying'
  IF TG_TABLE_NAME = 'document_requests' AND TG_OP = 'UPDATE' THEN
    IF NEW.status = 'verifying' AND (OLD.status IS NULL OR OLD.status != 'verifying') THEN
      -- Validate all documents linked to this request
      FOR doc_record IN 
        SELECT id FROM documents 
        WHERE document_request_id = NEW.id
        AND validation_status IN ('pending', 'needs_review') -- Only validate if not already validated
      LOOP
        -- Trigger validation via HTTP call (non-blocking, async)
        SELECT net.http_post(
          url := supabase_url || '/functions/v1/validate-document',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || service_role_key,
            'Content-Type', 'application/json'
          ),
          body := jsonb_build_object('documentId', doc_record.id::text)
        ) INTO request_id;
        
        RAISE NOTICE 'Triggered validation for document % (request %)', doc_record.id, NEW.id;
      END LOOP;
    END IF;
    
    RETURN NEW;
  END IF;

  -- Case 2: document inserted with document_request_id where request status is 'verifying'
  IF TG_TABLE_NAME = 'documents' AND TG_OP = 'INSERT' THEN
    IF NEW.document_request_id IS NOT NULL THEN
      -- Check if the linked request is in 'verifying' status
      IF EXISTS (
        SELECT 1 FROM document_requests 
        WHERE id = NEW.document_request_id 
        AND status = 'verifying'
      ) THEN
        -- Only validate if not already validated
        IF NEW.validation_status IN ('pending', 'needs_review') OR NEW.validation_status IS NULL THEN
          -- Trigger validation via HTTP call (non-blocking, async)
          SELECT net.http_post(
            url := supabase_url || '/functions/v1/validate-document',
            headers := jsonb_build_object(
              'Authorization', 'Bearer ' || service_role_key,
              'Content-Type', 'application/json'
            ),
            body := jsonb_build_object('documentId', NEW.id::text)
          ) INTO request_id;
          
          RAISE NOTICE 'Triggered validation for new document % (request %)', NEW.id, NEW.document_request_id;
        END IF;
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Check and Complete Request on Validation
-- ============================================================================
-- Checks if all documents for a request are verified and marks request as completed
-- This function is called when document_validations are inserted/updated
CREATE OR REPLACE FUNCTION check_and_complete_request_on_validation()
RETURNS TRIGGER AS $$
DECLARE
  request_id UUID;
  total_docs INTEGER;
  verified_docs INTEGER;
BEGIN
  -- Get the document_request_id from the document
  SELECT document_request_id INTO request_id
  FROM documents
  WHERE id = NEW.document_id;

  -- Only proceed if document is linked to a request and validation passed
  IF request_id IS NOT NULL 
     AND NEW.overall_status = 'verified' 
     AND NEW.can_auto_approve = true THEN
    
    -- Count total documents for this request
    SELECT COUNT(*) INTO total_docs
    FROM documents
    WHERE document_request_id = request_id;

    -- Count verified documents (validation_status = 'verified' and can_auto_approve = true)
    SELECT COUNT(*) INTO verified_docs
    FROM documents d
    INNER JOIN document_validations dv ON d.id = dv.document_id
    WHERE d.document_request_id = request_id
      AND dv.overall_status = 'verified'
      AND dv.can_auto_approve = true;

    -- If all documents are verified, mark request as completed
    IF total_docs > 0 AND verified_docs = total_docs THEN
      UPDATE document_requests
      SET 
        status = 'completed',
        completed_at = COALESCE(completed_at, NOW()),
        status_changed_by = NULL, -- System change
        updated_at = NOW()
      WHERE id = request_id
        AND status != 'completed'; -- Only update if not already completed

      RAISE NOTICE 'Auto-completed document request % (all % documents verified)', request_id, verified_docs;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-trigger Validation on Request Status Change
-- ============================================================================
-- Triggers validation when document_request status changes to 'verifying'
DROP TRIGGER IF EXISTS trigger_auto_validate_on_verification ON document_requests;
CREATE TRIGGER trigger_auto_validate_on_verification
  AFTER UPDATE OF status ON document_requests
  FOR EACH ROW
  WHEN (NEW.status = 'verifying' AND (OLD.status IS NULL OR OLD.status != 'verifying'))
  EXECUTE FUNCTION trigger_validation_on_verification();

-- ============================================================================
-- TRIGGER: Auto-trigger Validation on Document Insert
-- ============================================================================
-- Triggers validation when a document is inserted with document_request_id 
-- where the request status is 'verifying'
DROP TRIGGER IF EXISTS trigger_auto_validate_on_document_insert ON documents;
CREATE TRIGGER trigger_auto_validate_on_document_insert
  AFTER INSERT ON documents
  FOR EACH ROW
  WHEN (NEW.document_request_id IS NOT NULL)
  EXECUTE FUNCTION trigger_validation_on_verification();

-- ============================================================================
-- TRIGGER: Auto-complete Request on Validation
-- ============================================================================
-- Checks and completes request when validation results are inserted/updated
DROP TRIGGER IF EXISTS trigger_auto_complete_on_validation ON document_validations;
CREATE TRIGGER trigger_auto_complete_on_validation
  AFTER INSERT OR UPDATE OF overall_status, can_auto_approve ON document_validations
  FOR EACH ROW
  WHEN (NEW.overall_status = 'verified' AND NEW.can_auto_approve = true)
  EXECUTE FUNCTION check_and_complete_request_on_validation();

-- ============================================================================
-- Comments for Documentation
-- ============================================================================
COMMENT ON FUNCTION trigger_validation_on_verification() IS 
'Triggers validation for documents when they enter verification phase. Called when: 1) request status changes to verifying, 2) document is inserted with request in verifying status. Uses pg_net to make async HTTP calls to validate-document edge function.';

COMMENT ON FUNCTION check_and_complete_request_on_validation() IS 
'Checks if all documents for a request are verified and automatically marks the request as completed. Only completes if all documents have overall_status=verified and can_auto_approve=true.';

-- ============================================================================
-- Verification Queries (run after migration)
-- ============================================================================
-- Check triggers exist:
-- SELECT trigger_name, event_manipulation, event_object_table 
-- FROM information_schema.triggers 
-- WHERE trigger_name IN (
--   'trigger_auto_validate_on_verification',
--   'trigger_auto_validate_on_document_insert',
--   'trigger_auto_complete_on_validation'
-- );
--
-- Check functions exist:
-- SELECT routine_name, routine_type 
-- FROM information_schema.routines 
-- WHERE routine_name IN (
--   'trigger_validation_on_verification',
--   'check_and_complete_request_on_validation'
-- )
-- AND routine_schema = 'public';

