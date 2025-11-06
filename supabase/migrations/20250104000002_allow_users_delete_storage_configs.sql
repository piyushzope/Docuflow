-- Allow all organization members to delete (soft delete) storage configs
-- Currently only admins can update, but all members should be able to soft delete

-- The existing policy "Admins can manage storage configs in their organization" uses FOR ALL
-- which includes UPDATE, but it's restricted to admins only. We need to allow all members to UPDATE
-- for soft delete operations (setting is_active = false)

-- Keep the SELECT policy (it should already exist, but ensure it's there)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'storage_configs' 
        AND policyname = 'Users can view storage configs in their organization'
    ) THEN
        CREATE POLICY "Users can view storage configs in their organization"
            ON storage_configs FOR SELECT
            USING (
                organization_id = public.get_user_organization_id()
            );
    END IF;
END $$;

-- Drop existing policies (for idempotency)
DROP POLICY IF EXISTS "Users can update storage configs in their organization" ON storage_configs;
DROP POLICY IF EXISTS "Admins can manage storage configs in their organization" ON storage_configs;

-- Create policy for all users to update (soft delete and connect) storage configs
CREATE POLICY "Users can update storage configs in their organization"
    ON storage_configs FOR UPDATE
    USING (
        organization_id = public.get_user_organization_id()
    )
    WITH CHECK (
        organization_id = public.get_user_organization_id()
    );

-- Admins can still manage (insert/activate/modify) storage configs
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
    )
    WITH CHECK (
        organization_id = public.get_user_organization_id()
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND organization_id = storage_configs.organization_id 
            AND role IN ('owner', 'admin')
        )
    );

