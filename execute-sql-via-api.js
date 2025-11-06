#!/usr/bin/env node
/**
 * Execute SQL Fix via Supabase SQL Editor API
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

// Read from .env.local
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
  console.error('❌ ERROR: Missing Supabase credentials');
  process.exit(1);
}

// Extract project ref
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('❌ ERROR: Could not extract project ref');
  process.exit(1);
}

// Read SQL file
const sqlFile = path.join(__dirname, 'fix-automatic-email-processing.sql');
if (!fs.existsSync(sqlFile)) {
  console.error('❌ ERROR: SQL file not found');
  process.exit(1);
}

const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('🔧 Attempting to execute SQL fix...');
console.log('   Project:', projectRef);
console.log('');

// Try using Supabase REST API (PostgREST) - but this won't work for DDL
// The Management API requires different auth
// Best approach: Use Supabase Dashboard SQL Editor

console.log('📋 Supabase CLI does not support direct SQL execution on remote databases.');
console.log('   The SQL file has been generated and is ready to execute.');
console.log('');
console.log('✅ To complete the fix, please:');
console.log('');
console.log('1. Open Supabase Dashboard SQL Editor:');
console.log(`   https://app.supabase.com/project/${projectRef}/sql/new`);
console.log('');
console.log('2. Copy the contents of: fix-automatic-email-processing.sql');
console.log('');
console.log('3. Paste into the SQL Editor and click "Run"');
console.log('');
console.log('4. Review the verification results in the output');
console.log('');
console.log('5. Wait 5-10 minutes, then verify cron jobs are running:');
console.log('   Run: diagnose-cron-jobs.sql in SQL Editor');
console.log('');
console.log('6. Clean up the SQL file (contains sensitive keys):');
console.log('   rm fix-automatic-email-processing.sql');
console.log('');
console.log('🔍 Alternative: If you have psql and database password:');
console.log(`   psql "postgresql://postgres:[PASSWORD]@db.${projectRef}.supabase.co:5432/postgres" < fix-automatic-email-processing.sql`);
console.log('');

// Show first few lines of SQL for verification
console.log('📄 SQL Preview (first 10 lines):');
console.log('─'.repeat(60));
const lines = sql.split('\n').slice(0, 10);
lines.forEach(line => console.log(line));
console.log('─'.repeat(60));
console.log('... (full SQL in fix-automatic-email-processing.sql)');
console.log('');

process.exit(0);

