-- Add DELETE policy for documents
-- Allows users to delete documents in their organization

-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Users can delete documents in their organization" ON documents;

-- Create DELETE policy for documents
-- Users can delete documents that belong to their organization
CREATE POLICY "Users can delete documents in their organization"
    ON documents FOR DELETE
    USING (
        organization_id = public.get_user_organization_id()
    );

