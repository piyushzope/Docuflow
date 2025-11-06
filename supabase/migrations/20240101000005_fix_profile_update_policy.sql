-- Fix profile UPDATE policy to allow users to update their organization_id
-- The current policy might be too restrictive

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Allow users to update their own profile, including organization_id
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Also allow INSERT if profile doesn't exist (for edge cases)
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (id = auth.uid());
