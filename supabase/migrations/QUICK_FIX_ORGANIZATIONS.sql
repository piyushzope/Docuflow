-- Quick Fix: Allow authenticated users to insert into organizations
-- Run this immediately in Supabase SQL Editor

-- First, make sure the helper function exists
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Users can update their own organization" ON organizations;

-- Recreate all organization policies with proper INSERT policy
CREATE POLICY "Users can view their own organization"
    ON organizations FOR SELECT
    USING (
        id = public.get_user_organization_id()
        OR auth.uid() IS NOT NULL  -- Allow viewing if user exists (for initial creation)
    );

CREATE POLICY "Users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

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
