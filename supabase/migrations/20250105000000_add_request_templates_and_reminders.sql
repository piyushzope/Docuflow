-- Migration: Add Request Templates and Reminder/Repeat Functionality
-- Created: 2025-01-05
-- Description: 
--   1. Creates request_templates table for document request templates
--   2. Adds reminder and repeat fields to document_requests table
--   3. Creates default templates (Driver's License, MEC, EAD, Passport)
--   4. Adds last_reminder_sent field for tracking

-- ============================================================================
-- REQUEST TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS request_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    message_body TEXT,
    request_type TEXT,
    default_due_days INTEGER DEFAULT 30, -- Default due date in days from creation
    default_reminder_months INTEGER DEFAULT 1 CHECK (default_reminder_months >= 0 AND default_reminder_months <= 24),
    is_global BOOLEAN DEFAULT false, -- Global templates available to all organizations
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_org_or_global CHECK (organization_id IS NOT NULL OR is_global = true)
);

-- Indexes for templates
CREATE INDEX IF NOT EXISTS idx_request_templates_organization ON request_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_request_templates_global ON request_templates(is_global) WHERE is_global = true;

-- ============================================================================
-- ADD FIELDS TO DOCUMENT_REQUESTS
-- ============================================================================
-- Add reminder and repeat fields
ALTER TABLE document_requests 
ADD COLUMN IF NOT EXISTS reminder_months INTEGER DEFAULT 1 CHECK (reminder_months >= 0 AND reminder_months <= 24),
ADD COLUMN IF NOT EXISTS repeat_interval_type TEXT CHECK (repeat_interval_type IN ('days', 'months')),
ADD COLUMN IF NOT EXISTS repeat_interval_value INTEGER CHECK (repeat_interval_value > 0),
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES request_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS parent_request_id UUID REFERENCES document_requests(id) ON DELETE SET NULL, -- For tracking repeated requests
ADD COLUMN IF NOT EXISTS send_immediately BOOLEAN DEFAULT true; -- Whether to send email on creation

-- Indexes for new fields
CREATE INDEX IF NOT EXISTS idx_document_requests_template ON document_requests(template_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_parent ON document_requests(parent_request_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_reminder ON document_requests(last_reminder_sent, reminder_months) WHERE reminder_months > 0;

-- ============================================================================
-- INSERT DEFAULT GLOBAL TEMPLATES
-- ============================================================================
INSERT INTO request_templates (id, organization_id, name, subject, message_body, request_type, default_due_days, default_reminder_months, is_global)
VALUES 
  (
    gen_random_uuid(),
    NULL,
    'Driver''s License',
    'Request for Driver''s License',
    'Please submit a copy of your current Driver''s License. The document should be clear, legible, and show all relevant information including expiration date.

Thank you for your prompt attention to this matter.',
    'Driver''s License',
    30,
    1,
    true
  ),
  (
    gen_random_uuid(),
    NULL,
    'Medical Examiner Card (MEC)',
    'Request for Medical Examiner Card (MEC) - Expires Every 2 Years',
    'Please submit a copy of your current Medical Examiner Card (MEC). 

IMPORTANT: The MEC expires every 2 years. Please ensure you submit a valid card and note the expiration date for future renewal reminders.

Thank you for your prompt attention to this matter.',
    'Medical Examiner Card (MEC)',
    30,
    24, -- 24 months = 2 years
    true
  ),
  (
    gen_random_uuid(),
    NULL,
    'EAD (Employment Authorization Document)',
    'Request for EAD (Employment Authorization Document)',
    'Please submit a copy of your current Employment Authorization Document (EAD). The document should be clear, legible, and show all relevant information including expiration date.

Thank you for your prompt attention to this matter.',
    'EAD',
    30,
    1,
    true
  ),
  (
    gen_random_uuid(),
    NULL,
    'Passport (International)',
    'Request for Passport - International',
    'Please submit a copy of your passport. For international passports (typically Indian passports), please ensure all pages are clearly visible and legible. Include the photo page and any pages with relevant stamps or visas.

Thank you for your prompt attention to this matter.',
    'Passport',
    30,
    6,
    true
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- RLS POLICIES FOR REQUEST TEMPLATES
-- ============================================================================
ALTER TABLE request_templates ENABLE ROW LEVEL SECURITY;

-- Users can view global templates and templates in their organization
DROP POLICY IF EXISTS "Users can view request templates" ON request_templates;
CREATE POLICY "Users can view request templates"
  ON request_templates FOR SELECT
  USING (
    is_global = true 
    OR organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Users can create templates for their organization
DROP POLICY IF EXISTS "Users can create request templates in their organization" ON request_templates;
CREATE POLICY "Users can create request templates in their organization"
  ON request_templates FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Users can update templates in their organization
DROP POLICY IF EXISTS "Users can update request templates in their organization" ON request_templates;
CREATE POLICY "Users can update request templates in their organization"
  ON request_templates FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Users can delete templates in their organization
DROP POLICY IF EXISTS "Users can delete request templates in their organization" ON request_templates;
CREATE POLICY "Users can delete request templates in their organization"
  ON request_templates FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTION: Create Repeated Request
-- ============================================================================
-- This function creates a new request based on a parent request's repeat settings
CREATE OR REPLACE FUNCTION create_repeated_request(parent_request_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  parent_request RECORD;
  new_request_id UUID;
  new_due_date TIMESTAMPTZ;
BEGIN
  -- Get parent request details
  SELECT * INTO parent_request
  FROM document_requests
  WHERE id = parent_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent request not found';
  END IF;
  
  -- Calculate new due date based on repeat interval
  IF parent_request.repeat_interval_type = 'days' THEN
    new_due_date := COALESCE(parent_request.due_date, NOW()) + (parent_request.repeat_interval_value || ' days')::INTERVAL;
  ELSIF parent_request.repeat_interval_type = 'months' THEN
    new_due_date := COALESCE(parent_request.due_date, NOW()) + (parent_request.repeat_interval_value || ' months')::INTERVAL;
  ELSE
    new_due_date := parent_request.due_date;
  END IF;
  
  -- Create new request
  INSERT INTO document_requests (
    organization_id,
    email_account_id,
    recipient_email,
    subject,
    message_body,
    request_type,
    status,
    due_date,
    reminder_months,
    repeat_interval_type,
    repeat_interval_value,
    template_id,
    parent_request_id,
    created_by,
    send_immediately
  )
  VALUES (
    parent_request.organization_id,
    parent_request.email_account_id,
    parent_request.recipient_email,
    parent_request.subject,
    parent_request.message_body,
    parent_request.request_type,
    'pending',
    new_due_date,
    parent_request.reminder_months,
    parent_request.repeat_interval_type,
    parent_request.repeat_interval_value,
    parent_request.template_id,
    parent_request_id,
    parent_request.created_by,
    true -- Send immediately when repeating
  )
  RETURNING id INTO new_request_id;
  
  RETURN new_request_id;
END;
$$;

COMMENT ON FUNCTION create_repeated_request IS 'Creates a new document request based on a parent request with repeat settings';

