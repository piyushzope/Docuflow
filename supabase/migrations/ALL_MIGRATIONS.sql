-- Combined Migration File for Easy Setup
-- Run this entire file in Supabase SQL Editor to set up the database

-- ============================================
-- Migration 1: Initial Schema
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    settings JSONB DEFAULT '{}'::jsonb
);

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email accounts table
CREATE TABLE IF NOT EXISTS email_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
    email TEXT NOT NULL,
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    sync_settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, email)
);

-- Storage configurations
CREATE TABLE IF NOT EXISTS storage_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('google_drive', 'onedrive', 'sharepoint', 'azure_blob', 'supabase')),
    name TEXT NOT NULL,
    config JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routing rules
CREATE TABLE IF NOT EXISTS routing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document requests
CREATE TABLE IF NOT EXISTS document_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    email_account_id UUID REFERENCES email_accounts(id) ON DELETE SET NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message_body TEXT,
    request_type TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'received', 'missing_files', 'completed', 'expired')),
    due_date TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    document_request_id UUID REFERENCES document_requests(id) ON DELETE SET NULL,
    storage_config_id UUID REFERENCES storage_configs(id) ON DELETE SET NULL,
    routing_rule_id UUID REFERENCES routing_rules(id) ON DELETE SET NULL,
    email_account_id UUID REFERENCES email_accounts(id) ON DELETE SET NULL,
    sender_email TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    stored_filename TEXT,
    storage_path TEXT NOT NULL,
    storage_provider TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    mime_type TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'received' CHECK (status IN ('received', 'processed', 'verified', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs for audit trail
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_organization ON email_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_active ON email_accounts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_storage_configs_organization ON storage_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_storage_configs_default ON storage_configs(organization_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_routing_rules_organization ON routing_rules(organization_id);

-- ============================================
-- Migration: Add profile directory fields
-- ============================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS team TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT;
CREATE INDEX IF NOT EXISTS idx_routing_rules_active ON routing_rules(organization_id, priority) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_document_requests_organization ON document_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_status ON document_requests(status);
CREATE INDEX IF NOT EXISTS idx_document_requests_recipient ON document_requests(recipient_email);
CREATE INDEX IF NOT EXISTS idx_documents_organization ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_request ON documents(document_request_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_organization ON activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_accounts_updated_at ON email_accounts;
CREATE TRIGGER update_email_accounts_updated_at BEFORE UPDATE ON email_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_storage_configs_updated_at ON storage_configs;
CREATE TRIGGER update_storage_configs_updated_at BEFORE UPDATE ON storage_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_routing_rules_updated_at ON routing_rules;
CREATE TRIGGER update_routing_rules_updated_at BEFORE UPDATE ON routing_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_requests_updated_at ON document_requests;
CREATE TRIGGER update_document_requests_updated_at BEFORE UPDATE ON document_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Migration 2: Row Level Security (RLS)
-- ============================================

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Fix: Create helper function to avoid recursion
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Organizations policies (using function to avoid recursion)
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
CREATE POLICY "Users can view their own organization"
    ON organizations FOR SELECT
    USING (
        id = public.get_user_organization_id()
    );

DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
CREATE POLICY "Users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own organization" ON organizations;
CREATE POLICY "Users can update their own organization"
    ON organizations FOR UPDATE
    USING (
        id = public.get_user_organization_id()
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND organization_id = organizations.id 
            AND role IN ('owner', 'admin')
        )
    );

-- Profiles policies (fixed to avoid recursion)
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
CREATE POLICY "Users can view profiles in their organization"
    ON profiles FOR SELECT
    USING (
        organization_id = public.get_user_organization_id()
        OR id = auth.uid()  -- Users can always see their own profile
    );

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- Allow system to create profiles (for the trigger)
DROP POLICY IF EXISTS "System can create profiles via trigger" ON profiles;
CREATE POLICY "System can create profiles via trigger"
    ON profiles FOR INSERT
    WITH CHECK (true);

-- Email accounts policies (using function to avoid recursion)
DROP POLICY IF EXISTS "Users can view email accounts in their organization" ON email_accounts;
CREATE POLICY "Users can view email accounts in their organization"
    ON email_accounts FOR SELECT
    USING (
        organization_id = public.get_user_organization_id()
    );

DROP POLICY IF EXISTS "Admins can manage email accounts in their organization" ON email_accounts;
CREATE POLICY "Admins can manage email accounts in their organization"
    ON email_accounts FOR ALL
    USING (
        organization_id = public.get_user_organization_id()
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND organization_id = email_accounts.organization_id 
            AND role IN ('owner', 'admin')
        )
    );

-- Storage configs policies (using function to avoid recursion)
DROP POLICY IF EXISTS "Users can view storage configs in their organization" ON storage_configs;
CREATE POLICY "Users can view storage configs in their organization"
    ON storage_configs FOR SELECT
    USING (
        organization_id = public.get_user_organization_id()
    );

DROP POLICY IF EXISTS "Admins can manage storage storage configs in their organization" ON storage_configs;
DROP POLICY IF EXISTS "Admins can manage storage configs in their organization" ON storage_configs;
CREATE POLICY "Admins can manage storage configs in their organization"
    ON storage_configs FOR ALL
    USING (
        organization_id = public.get_user_organization_id()
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND organization_id = storage_configs.organization_id 
            AND role IN ('owner', 'admin')
        )
    );

-- Routing rules policies (using function to avoid recursion)
DROP POLICY IF EXISTS "Users can view routing rules in their organization" ON routing_rules;
CREATE POLICY "Users can view routing rules in their organization"
    ON routing_rules FOR SELECT
    USING (
        organization_id = public.get_user_organization_id()
    );

DROP POLICY IF EXISTS "Admins can manage routing rules in their organization" ON routing_rules;
CREATE POLICY "Admins can manage routing rules in their organization"
    ON routing_rules FOR ALL
    USING (
        organization_id = public.get_user_organization_id()
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND organization_id = routing_rules.organization_id 
            AND role IN ('owner', 'admin')
        )
    );

-- Document requests policies (using function to avoid recursion)
DROP POLICY IF EXISTS "Users can view document requests in their organization" ON document_requests;
CREATE POLICY "Users can view document requests in their organization"
    ON document_requests FOR SELECT
    USING (
        organization_id = public.get_user_organization_id()
    );

DROP POLICY IF EXISTS "Users can create document requests in their organization" ON document_requests;
CREATE POLICY "Users can create document requests in their organization"
    ON document_requests FOR INSERT
    WITH CHECK (
        organization_id = public.get_user_organization_id()
    );

DROP POLICY IF EXISTS "Users can update document requests in their organization" ON document_requests;
CREATE POLICY "Users can update document requests in their organization"
    ON document_requests FOR UPDATE
    USING (
        organization_id = public.get_user_organization_id()
    );

-- Documents policies (using function to avoid recursion)
DROP POLICY IF EXISTS "Users can view documents in their organization" ON documents;
CREATE POLICY "Users can view documents in their organization"
    ON documents FOR SELECT
    USING (
        organization_id = public.get_user_organization_id()
    );

DROP POLICY IF EXISTS "Users can update documents in their organization" ON documents;
CREATE POLICY "Users can update documents in their organization"
    ON documents FOR UPDATE
    USING (
        organization_id = public.get_user_organization_id()
    );

-- Activity logs policies (using function to avoid recursion)
DROP POLICY IF EXISTS "Users can view activity logs in their organization" ON activity_logs;
CREATE POLICY "Users can view activity logs in their organization"
    ON activity_logs FOR SELECT
    USING (
        organization_id = public.get_user_organization_id()
    );

DROP POLICY IF EXISTS "System can create activity logs" ON activity_logs;
CREATE POLICY "System can create activity logs"
    ON activity_logs FOR INSERT
    WITH CHECK (true);

-- ============================================
-- Migration 3: Profile Trigger
-- ============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
