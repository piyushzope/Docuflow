-- Allow all organization members to disconnect email accounts
-- Previously only admins could disconnect, but any member should be able to disconnect accounts

-- First, handle any existing data inconsistencies
-- Mark any accounts with NULL tokens as inactive (if they exist)
UPDATE email_accounts 
SET is_active = false 
WHERE encrypted_access_token IS NULL AND is_active = true;

-- Now modify the schema to allow NULL values for encrypted tokens when accounts are disconnected
-- This allows us to securely clear tokens when disconnecting accounts
ALTER TABLE email_accounts 
    ALTER COLUMN encrypted_access_token DROP NOT NULL;

-- Add a check constraint to ensure active accounts always have tokens
-- This maintains data integrity: active accounts must have tokens, disconnected accounts can have null tokens
ALTER TABLE email_accounts
    DROP CONSTRAINT IF EXISTS email_accounts_active_accounts_require_tokens;

ALTER TABLE email_accounts
    ADD CONSTRAINT email_accounts_active_accounts_require_tokens 
    CHECK (
        (is_active = false) OR 
        (is_active = true AND encrypted_access_token IS NOT NULL)
    );

-- Refresh token already allows NULL, but ensure it's consistent
-- (This should already be NULL, but making it explicit)
-- encrypted_refresh_token already allows NULL, so no change needed

-- Drop the existing admin-only policy for email account updates (disconnect)
DROP POLICY IF EXISTS "Admins can manage email accounts in their organization" ON email_accounts;

-- Create separate policies for different operations
-- All members can view email accounts (already exists, keeping for reference)
-- Keep the existing view policy if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'email_accounts' 
        AND policyname = 'Users can view email accounts in their organization'
    ) THEN
        CREATE POLICY "Users can view email accounts in their organization"
            ON email_accounts FOR SELECT
            USING (
                organization_id = public.get_user_organization_id()
            );
    END IF;
END $$;

-- Allow all organization members to disconnect (deactivate) email accounts
-- They can update accounts to set is_active = false and clear tokens
-- This policy is more permissive to allow the disconnect functionality to work
DROP POLICY IF EXISTS "Users can disconnect email accounts in their organization" ON email_accounts;
CREATE POLICY "Users can disconnect email accounts in their organization"
    ON email_accounts FOR UPDATE
    USING (
        organization_id = public.get_user_organization_id()
    )
    WITH CHECK (
        organization_id = public.get_user_organization_id()
    );

-- Admins can still manage (insert/activate/modify) email accounts
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
    )
    WITH CHECK (
        organization_id = public.get_user_organization_id()
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND organization_id = email_accounts.organization_id 
            AND role IN ('owner', 'admin')
        )
    );

