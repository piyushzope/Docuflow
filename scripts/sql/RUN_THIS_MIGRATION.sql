-- Create a function to link organization to profile
-- This function uses SECURITY DEFINER to bypass RLS policies
-- Only allows the authenticated user to update their own profile

CREATE OR REPLACE FUNCTION public.link_user_to_organization(
  p_organization_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_org_exists BOOLEAN;
  v_verified_org_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Get user email from auth.users
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User email not found'
    );
  END IF;

  -- Verify organization exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = p_organization_id) INTO v_org_exists;
  
  IF NOT v_org_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization not found'
    );
  END IF;

  -- Update or insert profile (including email for both INSERT and UPDATE cases)
  INSERT INTO profiles (id, email, organization_id, role, updated_at)
  VALUES (v_user_id, v_user_email, p_organization_id, 'owner', NOW())
  ON CONFLICT (id) 
  DO UPDATE SET 
    email = COALESCE(profiles.email, v_user_email), -- Update email if it's null
    organization_id = p_organization_id,
    role = COALESCE(profiles.role, 'owner'),
    updated_at = NOW()
  WHERE profiles.id = v_user_id;

  -- Verify update worked (check that profile now has the organization_id)
  SELECT organization_id INTO v_verified_org_id
  FROM profiles
  WHERE id = v_user_id;

  IF v_verified_org_id IS NULL OR v_verified_org_id != p_organization_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to update profile'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', p_organization_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.link_user_to_organization(UUID) TO authenticated;

