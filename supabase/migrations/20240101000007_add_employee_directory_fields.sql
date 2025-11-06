-- Add employee directory fields to profiles table
-- These fields enhance the employee directory with job titles, departments, contact info, and skills

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS team TEXT;

-- Create index for department and team filtering
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(organization_id, department) WHERE department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_team ON profiles(organization_id, team) WHERE team IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_job_title ON profiles(organization_id, job_title) WHERE job_title IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.job_title IS 'Employee job title or position';
COMMENT ON COLUMN profiles.department IS 'Department or functional area';
COMMENT ON COLUMN profiles.team IS 'Team or working group within the department';
COMMENT ON COLUMN profiles.phone IS 'Contact phone number';
COMMENT ON COLUMN profiles.avatar_url IS 'URL to employee profile picture';
COMMENT ON COLUMN profiles.skills IS 'JSON array of skills or areas of expertise';
COMMENT ON COLUMN profiles.bio IS 'Short biography or description';
COMMENT ON COLUMN profiles.location IS 'Employee location or office';

