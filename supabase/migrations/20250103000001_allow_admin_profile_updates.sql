-- Migration: Allow admins to update any profile in their organization
-- This creates a SECURITY DEFINER function that bypasses RLS for admin updates

-- Function to allow admins/owners to update profiles in their organization
CREATE OR REPLACE FUNCTION public.update_profile_as_admin(
  p_profile_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_job_title TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_team TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_skills JSONB DEFAULT NULL,
  p_role TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_user_org_id UUID;
  v_target_org_id UUID;
  v_current_role TEXT;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Get user's role and organization
  SELECT role, organization_id INTO v_user_role, v_user_org_id
  FROM profiles
  WHERE id = v_user_id
  LIMIT 1;

  -- Check if user is admin or owner
  IF v_user_role NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only administrators can update other profiles'
    );
  END IF;

  IF v_user_org_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User must be part of an organization'
    );
  END IF;

  -- Get target profile's organization and current role
  SELECT organization_id, role INTO v_target_org_id, v_current_role
  FROM profiles
  WHERE id = p_profile_id
  LIMIT 1;

  IF v_target_org_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Target profile not found'
    );
  END IF;

  -- Verify both profiles are in the same organization
  IF v_target_org_id != v_user_org_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Target profile is not in your organization'
    );
  END IF;

  -- Prevent non-owners from changing roles
  IF p_role IS NOT NULL AND p_role != v_current_role THEN
    IF v_user_role != 'owner' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Only organization owners can change user roles'
      );
    END IF;
    
    -- Prevent removing the last owner
    IF v_current_role = 'owner' AND p_role != 'owner' THEN
      IF (SELECT COUNT(*) FROM profiles WHERE organization_id = v_user_org_id AND role = 'owner') <= 1 THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Cannot remove the last owner from the organization'
        );
      END IF;
    END IF;
  END IF;

  -- Update the profile (only update fields that are provided)
  UPDATE profiles
  SET
    full_name = COALESCE(p_full_name, full_name),
    job_title = COALESCE(p_job_title, job_title),
    department = COALESCE(p_department, department),
    team = COALESCE(p_team, team),
    phone = COALESCE(p_phone, phone),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    location = COALESCE(p_location, location),
    bio = COALESCE(p_bio, bio),
    skills = COALESCE(p_skills, skills),
    role = COALESCE(p_role, role),
    updated_at = NOW()
  WHERE id = p_profile_id;

  RETURN jsonb_build_object(
    'success', true,
    'profile_id', p_profile_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_profile_as_admin(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT
) TO authenticated;

