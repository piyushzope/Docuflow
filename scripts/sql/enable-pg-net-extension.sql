-- Enable pg_net Extension for HTTP Requests
-- This extension is required for cron jobs to call Edge Functions via HTTP
-- Run this in Supabase SQL Editor

-- Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Verify extension is enabled
SELECT 
  'pg_net Extension Status' AS check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ ENABLED'
    ELSE '❌ NOT ENABLED - Enable via Dashboard > Database > Extensions'
  END AS status,
  COALESCE(MAX(extversion), 'N/A') AS version
FROM pg_extension 
WHERE extname = 'pg_net';

-- If extension is not enabled, you may need to enable it via:
-- Supabase Dashboard > Database > Extensions > Search for "pg_net" > Enable

