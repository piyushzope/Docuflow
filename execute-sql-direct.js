#!/usr/bin/env node
/**
 * Execute SQL Fix via Direct Postgres Connection
 * Uses psql or node-postgres to execute SQL directly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables
const envPath = path.join(__dirname, 'apps', 'web', '.env.local');
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Read from .env.local if needed
if (!supabaseUrl) {
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
      }
    }
  }
}

if (!supabaseUrl) {
  console.error('❌ ERROR: NEXT_PUBLIC_SUPABASE_URL not found');
  process.exit(1);
}

// Extract project ref and construct connection string
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('❌ ERROR: Could not extract project ref from URL');
  process.exit(1);
}

// Read SQL file
const sqlFile = path.join(__dirname, 'fix-automatic-email-processing.sql');
if (!fs.existsSync(sqlFile)) {
  console.error('❌ ERROR: SQL file not found:', sqlFile);
  process.exit(1);
}

const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('🔧 Executing SQL fix...');
console.log('   Project:', projectRef);
console.log('   URL:', supabaseUrl);
console.log('');

// Try using Supabase CLI to execute via migration
console.log('📝 Creating temporary migration file...');
const migrationName = `fix_automatic_email_processing_${Date.now()}`;
const migrationFile = path.join(__dirname, 'supabase', 'migrations', `${migrationName}.sql`);

// Ensure migrations directory exists
const migrationsDir = path.dirname(migrationFile);
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

// Write migration file
fs.writeFileSync(migrationFile, sql);

console.log('✅ Migration file created:', migrationFile);
console.log('');
console.log('⚠️  Supabase CLI does not support direct SQL execution on remote databases.');
console.log('');
console.log('📋 Please run the SQL manually in Supabase Dashboard:');
console.log('');
console.log('1. Open: https://app.supabase.com/project/' + projectRef + '/sql/new');
console.log('2. Copy the contents of: fix-automatic-email-processing.sql');
console.log('3. Paste into the SQL Editor');
console.log('4. Click "Run"');
console.log('');
console.log('Or use psql if you have the database password:');
console.log('   psql "postgresql://postgres:[PASSWORD]@db.' + projectRef + '.supabase.co:5432/postgres" < fix-automatic-email-processing.sql');
console.log('');

// Clean up migration file
try {
  fs.unlinkSync(migrationFile);
} catch (e) {
  // Ignore cleanup errors
}

process.exit(0);

