-- ============================================================================
-- SET DATABASE SETTINGS FOR CRON JOBS
-- ============================================================================
-- Run this first to configure database settings for cron job creation
-- Replace YOUR_SERVICE_ROLE_KEY with your actual service role key
-- ============================================================================

-- Set Supabase URL
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://nneyhfhdthpxmkemyenm.supabase.co';

-- Set service role key (REPLACE with your actual key)
-- Get this from: Supabase Dashboard > Project Settings > API > service_role key
ALTER DATABASE postgres SET app.settings.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uZXloZmhkdGhweG1rZW15ZW5tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAyOTY5OCwiZXhwIjoyMDc3NjA1Njk4fQ.PEN5cMQgEfO39L4GO4pNUw19OFTNF_8VITrjdRG_z84';

-- Verify settings were set
DO $$
BEGIN
  RAISE NOTICE 'Database settings configured.';
  RAISE NOTICE 'Supabase URL: https://nneyhfhdthpxmkemyenm.supabase.co';
  RAISE NOTICE 'Service role key: (hidden)';
  RAISE NOTICE 'Now you can run create-validation-worker-cron-job.sql';
END $$;

-- Show settings (service role key will be hidden)
SELECT 
  name,
  CASE 
    WHEN name = 'app.settings.service_role_key' THEN '***HIDDEN***'
    ELSE setting
  END as setting_value
FROM pg_settings 
WHERE name IN ('app.settings.supabase_url', 'app.settings.service_role_key');

