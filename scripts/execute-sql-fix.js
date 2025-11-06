#!/usr/bin/env node
/**
 * Execute SQL Fix via Supabase Management API
 * This script executes the SQL fix directly using the Supabase REST API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables
const envPath = path.join(__dirname, 'apps', 'web', '.env.local');
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Read from .env.local if needed
if (!supabaseUrl || !serviceRoleKey) {
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
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ ERROR: Missing Supabase URL or service role key');
  process.exit(1);
}

// Read SQL file
const sqlFile = path.join(__dirname, 'fix-automatic-email-processing.sql');
if (!fs.existsSync(sqlFile)) {
  console.error('❌ ERROR: SQL file not found:', sqlFile);
  process.exit(1);
}

const sql = fs.readFileSync(sqlFile, 'utf8');

// Execute SQL via Supabase Management API
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('❌ ERROR: Could not extract project ref from URL');
  process.exit(1);
}

const apiUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

console.log('🔧 Executing SQL fix via Supabase Management API...');
console.log('   Project:', projectRef);
console.log('');

try {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: sql,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ ERROR: Failed to execute SQL');
    console.error('   Status:', response.status, response.statusText);
    console.error('   Response:', errorText);
    process.exit(1);
  }

  const result = await response.json();
  console.log('✅ SQL executed successfully!');
  console.log('');
  console.log('📊 Results:');
  console.log(JSON.stringify(result, null, 2));
  console.log('');
  console.log('🔍 Next steps:');
  console.log('1. Wait 5-10 minutes for the first cron job execution');
  console.log('2. Check cron.job_run_details for execution history');
  console.log('3. Monitor Edge Function logs in Supabase Dashboard');
  
} catch (error) {
  console.error('❌ ERROR:', error.message);
  console.error('');
  console.error('Alternative: Run the SQL manually in Supabase Dashboard:');
  console.error('1. Open Supabase Dashboard > SQL Editor');
  console.error('2. Copy contents of fix-automatic-email-processing.sql');
  console.error('3. Paste and click Run');
  process.exit(1);
}

