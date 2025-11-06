-- Fix RLS Policy Recursion Issues
-- This migration fixes infinite recursion in profiles table policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Admins can create profiles in their organization" ON profiles;

-- Fix: Use a function to avoid recursion
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

-- Profiles policies (fixed to avoid recursion)
CREATE POLICY "Users can view profiles in their organization"
    ON profiles FOR SELECT
    USING (
        organization_id = public.get_user_organization_id()
        OR id = auth.uid()  -- Users can always see their own profile
    );

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- Allow system to create profiles (for the trigger)
CREATE POLICY "System can create profiles via trigger"
    ON profiles FOR INSERT
    WITH CHECK (true);

-- Drop and recreate the organization policy to use the function
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
CREATE POLICY "Users can view their own organization"
    ON organizations FOR SELECT
    USING (
        id = public.get_user_organization_id()
    );

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
