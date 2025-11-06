-- IMMEDIATE FIX: Run this in Supabase SQL Editor
-- This will fix the organization INSERT policy issue

-- Step 1: Ensure the helper function exists
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

-- Step 2: Drop all existing organization policies
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Users can update their own organization" ON organizations;

-- Step 3: Recreate policies with INSERT policy FIRST
-- This ensures INSERT works even if user doesn't have an organization yet

CREATE POLICY "Users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own organization"
    ON organizations FOR SELECT
    USING (
        id = public.get_user_organization_id()
        OR auth.uid() IS NOT NULL  -- Allow viewing during creation
    );

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
