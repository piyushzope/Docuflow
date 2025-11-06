-- Migration: Add AI-powered document validation system
-- This migration adds tables and columns for automated document validation,
-- expiry tracking, and renewal reminders

-- Update documents table to add validation status (if not exists)
DO $$
BEGIN
  -- Add validation_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'validation_status'
  ) THEN
    ALTER TABLE documents 
    ADD COLUMN validation_status TEXT CHECK (validation_status IN ('pending', 'validating', 'verified', 'needs_review', 'rejected')) DEFAULT 'pending';
  END IF;

  -- Add validation_metadata column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'validation_metadata'
  ) THEN
    ALTER TABLE documents 
    ADD COLUMN validation_metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Update documents status enum to include new statuses
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'documents_status_check'
  ) THEN
    ALTER TABLE documents DROP CONSTRAINT documents_status_check;
  END IF;

  -- Add updated constraint
  ALTER TABLE documents 
  ADD CONSTRAINT documents_status_check 
  CHECK (status IN ('received', 'processed', 'verified', 'rejected', 'needs_review'));
END $$;

-- Create document_validations table (if not exists)
CREATE TABLE IF NOT EXISTS document_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL UNIQUE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Classification
  document_type TEXT,
  document_type_confidence DECIMAL(3,2),
  issuing_country TEXT,
  document_number TEXT,
  
  -- Owner Matching
  matched_employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name_match_score DECIMAL(3,2),
  dob_match BOOLEAN,
  owner_match_confidence DECIMAL(3,2),
  
  -- Expiry
  expiry_date DATE,
  issue_date DATE,
  expiry_status TEXT CHECK (expiry_status IN ('expired', 'expiring_soon', 'expiring_later', 'no_expiry')),
  days_until_expiry INTEGER,
  
  -- Authenticity
  authenticity_score DECIMAL(3,2),
  image_quality_score DECIMAL(3,2),
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_of_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  
  -- Request Compliance
  matches_request_type BOOLEAN,
  request_compliance_score DECIMAL(3,2),
  
  -- Overall
  overall_status TEXT CHECK (overall_status IN ('verified', 'needs_review', 'rejected')),
  can_auto_approve BOOLEAN DEFAULT false,
  requires_admin_review BOOLEAN DEFAULT false,
  review_priority TEXT CHECK (review_priority IN ('low', 'medium', 'high', 'critical')),
  
  -- Metadata (stores detailed validation results)
  validation_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  validated_by TEXT DEFAULT 'ai_system',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create document_renewal_reminders table (if not exists)
CREATE TABLE IF NOT EXISTS document_renewal_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reminder_date DATE NOT NULL,
  reminder_type TEXT CHECK (reminder_type IN ('90_days', '60_days', '30_days', 'expired')) NOT NULL,
  sent_at TIMESTAMPTZ,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for document_validations (create if not exists)
CREATE INDEX IF NOT EXISTS idx_document_validations_document_id ON document_validations(document_id);
CREATE INDEX IF NOT EXISTS idx_document_validations_organization_id ON document_validations(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_validations_status ON document_validations(overall_status);
CREATE INDEX IF NOT EXISTS idx_document_validations_expiry ON document_validations(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_validations_needs_review ON document_validations(organization_id, requires_admin_review) WHERE requires_admin_review = true;
CREATE INDEX IF NOT EXISTS idx_document_validations_employee ON document_validations(matched_employee_id) WHERE matched_employee_id IS NOT NULL;

-- Indexes for document_renewal_reminders (create if not exists)
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_date ON document_renewal_reminders(reminder_date) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_document ON document_renewal_reminders(document_id);
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_organization ON document_renewal_reminders(organization_id);
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_employee ON document_renewal_reminders(employee_id) WHERE employee_id IS NOT NULL;

-- Add updated_at trigger for document_validations (drop and recreate if exists)
DROP TRIGGER IF EXISTS update_document_validations_updated_at ON document_validations;
CREATE TRIGGER update_document_validations_updated_at
  BEFORE UPDATE ON document_validations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for document_renewal_reminders (drop and recreate if exists)
DROP TRIGGER IF EXISTS update_document_renewal_reminders_updated_at ON document_renewal_reminders;
CREATE TRIGGER update_document_renewal_reminders_updated_at
  BEFORE UPDATE ON document_renewal_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for document_validations
ALTER TABLE document_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view validations for their organization" ON document_validations;
CREATE POLICY "Users can view validations for their organization"
  ON document_validations
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Only service role can insert validations" ON document_validations;
CREATE POLICY "Only service role can insert validations"
  ON document_validations
  FOR INSERT
  WITH CHECK (true); -- Edge functions use service role

DROP POLICY IF EXISTS "Users can update validations for their organization" ON document_validations;
CREATE POLICY "Users can update validations for their organization"
  ON document_validations
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for document_renewal_reminders
ALTER TABLE document_renewal_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view renewal reminders for their organization" ON document_renewal_reminders;
CREATE POLICY "Users can view renewal reminders for their organization"
  ON document_renewal_reminders
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Only service role can insert renewal reminders" ON document_renewal_reminders;
CREATE POLICY "Only service role can insert renewal reminders"
  ON document_renewal_reminders
  FOR INSERT
  WITH CHECK (true); -- Edge functions use service role

DROP POLICY IF EXISTS "Users can update renewal reminders for their organization" ON document_renewal_reminders;
CREATE POLICY "Users can update renewal reminders for their organization"
  ON document_renewal_reminders
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Function to automatically create renewal reminders when a document is validated with expiry date
CREATE OR REPLACE FUNCTION create_renewal_reminders()
RETURNS TRIGGER AS $$
DECLARE
  doc_org_id UUID;
  doc_employee_id UUID;
  expiry_dt DATE;
  days_until_expiry INTEGER;
BEGIN
  -- Only process if expiry_date is set and document is validated
  IF NEW.expiry_date IS NOT NULL AND NEW.overall_status = 'verified' THEN
    -- Get organization and employee from validation record itself
    doc_org_id := NEW.organization_id;
    doc_employee_id := NEW.matched_employee_id;
    
    expiry_dt := NEW.expiry_date;
    days_until_expiry := expiry_dt - CURRENT_DATE;
    
    -- Delete existing reminders for this document
    DELETE FROM document_renewal_reminders WHERE document_id = NEW.document_id;
    
    -- Create reminders based on expiry date
    IF days_until_expiry > 0 THEN
      -- Create 90-day reminder (only if expiry is more than 90 days away)
      IF days_until_expiry > 90 THEN
        INSERT INTO document_renewal_reminders (
          document_id, organization_id, employee_id, reminder_date, reminder_type
        ) VALUES (
          NEW.document_id, doc_org_id, doc_employee_id, expiry_dt - INTERVAL '90 days', '90_days'
        );
      END IF;
      
      -- Create 60-day reminder (only if expiry is more than 60 days away)
      IF days_until_expiry > 60 THEN
        INSERT INTO document_renewal_reminders (
          document_id, organization_id, employee_id, reminder_date, reminder_type
        ) VALUES (
          NEW.document_id, doc_org_id, doc_employee_id, expiry_dt - INTERVAL '60 days', '60_days'
        );
      END IF;
      
      -- Create 30-day reminder (only if expiry is more than 30 days away)
      IF days_until_expiry > 30 THEN
        INSERT INTO document_renewal_reminders (
          document_id, organization_id, employee_id, reminder_date, reminder_type
        ) VALUES (
          NEW.document_id, doc_org_id, doc_employee_id, expiry_dt - INTERVAL '30 days', '30_days'
        );
      END IF;
      
      -- If expiry is within 30 days, create immediate 30-day reminder
      IF days_until_expiry <= 30 THEN
        INSERT INTO document_renewal_reminders (
          document_id, organization_id, employee_id, reminder_date, reminder_type
        ) VALUES (
          NEW.document_id, doc_org_id, doc_employee_id, CURRENT_DATE, '30_days'
        );
      END IF;
    ELSE
      -- Document is expired, create expired reminder
      INSERT INTO document_renewal_reminders (
        document_id, organization_id, employee_id, reminder_date, reminder_type
      ) VALUES (
        NEW.document_id, doc_org_id, doc_employee_id, CURRENT_DATE, 'expired'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create renewal reminders when validation is inserted/updated
DROP TRIGGER IF EXISTS trigger_create_renewal_reminders ON document_validations;
CREATE TRIGGER trigger_create_renewal_reminders
  AFTER INSERT OR UPDATE OF expiry_date, overall_status ON document_validations
  FOR EACH ROW
  EXECUTE FUNCTION create_renewal_reminders();

-- Function to update document status based on validation
CREATE OR REPLACE FUNCTION update_document_status_from_validation()
RETURNS TRIGGER AS $$
BEGIN
  -- Update document validation_status
  UPDATE documents
  SET 
    validation_status = CASE 
      WHEN NEW.overall_status = 'verified' THEN 'verified'
      WHEN NEW.overall_status = 'needs_review' THEN 'needs_review'
      WHEN NEW.overall_status = 'rejected' THEN 'rejected'
      ELSE 'pending'
    END,
    validation_metadata = NEW.validation_metadata,
    status = CASE 
      WHEN NEW.overall_status = 'verified' AND NEW.can_auto_approve THEN 'verified'
      WHEN NEW.overall_status = 'needs_review' THEN 'needs_review'
      WHEN NEW.overall_status = 'rejected' THEN 'rejected'
      ELSE documents.status
    END,
    updated_at = NOW()
  WHERE id = NEW.document_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update document status when validation is created/updated
DROP TRIGGER IF EXISTS trigger_update_document_status ON document_validations;
CREATE TRIGGER trigger_update_document_status
  AFTER INSERT OR UPDATE OF overall_status, can_auto_approve ON document_validations
  FOR EACH ROW
  EXECUTE FUNCTION update_document_status_from_validation();

-- Add comment for documentation
COMMENT ON TABLE document_validations IS 'Stores AI-powered validation results for documents including classification, owner matching, expiry tracking, and authenticity checks';
COMMENT ON TABLE document_renewal_reminders IS 'Tracks renewal reminders for documents with expiry dates (90, 60, 30 days before expiry and on expiry)';

