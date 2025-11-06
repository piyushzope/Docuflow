-- Configure Database Settings for Cron Jobs
-- This sets the required database settings for automatic email processing
-- Run this in Supabase SQL Editor

-- Set Supabase URL
ALTER DATABASE postgres 
SET app.settings.supabase_url = 'https://nneyhfhdthpxmkemyenm.supabase.co';

-- Set Service Role Key (keep this secret!)
ALTER DATABASE postgres 
SET app.settings.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uZXloZmhkdGhweG1rZW15ZW5tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAyOTY5OCwiZXhwIjoyMDc3NjA1Njk4fQ.PEN5cMQgEfO39L4GO4pNUw19OFTNF_8VITrjdRG_z84';

-- Verify settings are configured
SELECT 
  'Database Settings Status' AS check_name,
  name AS setting_name,
  CASE 
    WHEN setting IS NOT NULL AND setting != '' THEN '✅ CONFIGURED'
    ELSE '❌ NOT CONFIGURED'
  END AS status,
  CASE 
    WHEN name = 'app.settings.service_role_key' AND setting IS NOT NULL THEN 
      '***' || RIGHT(setting, 4) -- Show last 4 chars only for security
    ELSE setting
  END AS setting_value
FROM pg_settings 
WHERE name LIKE 'app.settings.%'
ORDER BY name;

