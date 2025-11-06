-- Add DELETE policy for document_requests
-- Allows users to delete document requests in their organization

-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Users can delete document requests in their organization" ON document_requests;

-- Create DELETE policy for document requests
-- Users can delete document requests that belong to their organization
CREATE POLICY "Users can delete document requests in their organization"
    ON document_requests FOR DELETE
    USING (
        organization_id = public.get_user_organization_id()
    );

