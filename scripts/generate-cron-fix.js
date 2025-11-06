#!/usr/bin/env node
/**
 * Generate cron jobs fix SQL with actual values from environment
 * 
 * Usage:
 *   node generate-cron-fix.js > fix-cron-jobs-with-values.sql
 *   Then run fix-cron-jobs-with-values.sql in Supabase SQL Editor
 */

const fs = require('fs');
const path = require('path');

// Try to load environment variables
const envPath = path.join(__dirname, 'apps', 'web', '.env.local');
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Try to read from .env.local if env vars not set
if (!supabaseUrl || !serviceRoleKey) {
  try {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      for (const line of envLines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          
          if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !supabaseUrl) {
            supabaseUrl = value;
          }
          if (key === 'SUPABASE_SERVICE_ROLE_KEY' && !serviceRoleKey) {
            serviceRoleKey = value;
          }
        }
      }
    }
  } catch (error) {
    console.error('Error reading .env.local:', error.message);
  }
}

// Validate required values
if (!supabaseUrl) {
  console.error('❌ ERROR: NEXT_PUBLIC_SUPABASE_URL not found');
  console.error('   Set it in apps/web/.env.local or as environment variable');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not found');
  console.error('   Set it in apps/web/.env.local or as environment variable');
  console.error('   Get it from: Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

// Read the fix template
const templatePath = path.join(__dirname, 'fix-cron-jobs.sql');
let template = fs.readFileSync(templatePath, 'utf8');

// Replace placeholders
const output = template
  .replace(/YOUR_SUPABASE_URL/g, supabaseUrl)
  .replace(/YOUR_SERVICE_ROLE_KEY/g, serviceRoleKey);

// Write output
const outputPath = path.join(__dirname, 'fix-cron-jobs-with-values.sql');
fs.writeFileSync(outputPath, output);

console.log('✅ Generated fix-cron-jobs-with-values.sql');
console.log('');
console.log('📋 Next steps:');
console.log('1. Open Supabase Dashboard > SQL Editor');
console.log('2. Copy and paste the contents of fix-cron-jobs-with-values.sql');
console.log('3. Click "Run"');
console.log('4. Wait 5-10 minutes, then run diagnose-cron-jobs.sql to verify');
console.log('');
console.log('⚠️  SECURITY: The generated file contains your service role key.');
console.log('   Delete it after use: rm fix-cron-jobs-with-values.sql');
console.log('');
console.log('Supabase URL:', supabaseUrl);
console.log('Service Role Key:', '***' + serviceRoleKey.slice(-4));


