-- MANUAL FIX: Link your organization to your profile
-- Replace '4418b084-38ef-4ecf-921e-83c35a8cda56' with your organization ID if different
-- Replace your_user_id with your actual user ID (run SELECT id FROM auth.users WHERE email = 'your_email'; first)

-- Option 1: If you know your user ID, run this:
-- UPDATE profiles 
-- SET organization_id = '4418b084-38ef-4ecf-921e-83c35a8cda56',
--     role = 'owner'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE');

-- Option 2: For the currently logged-in user (safer):
UPDATE profiles 
SET organization_id = '4418b084-38ef-4ecf-921e-83c35a8cda56',
    role = 'owner',
    updated_at = NOW()
WHERE id = auth.uid()
  AND organization_id IS NULL;

-- Verify it worked:
SELECT id, email, organization_id, role, updated_at 
FROM profiles 
WHERE id = auth.uid();
