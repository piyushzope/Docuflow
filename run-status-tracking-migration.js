#!/usr/bin/env node

/**
 * Run the status tracking migration
 * Applies the migration to add document request status tracking functionality
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://nneyhfhdthpxmkemyenm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Set it with:');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.error('  node run-status-tracking-migration.js');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Running Migration: Document Request Status Tracking');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Read migration file
    const migrationPath = join(__dirname, 'supabase/migrations/20250106000000_add_document_request_status_tracking.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded');
    console.log(`📊 Migration size: ${(migrationSQL.length / 1024).toFixed(2)} KB`);
    console.log('');

    // Split migration into individual statements (semicolon-separated)
    // Note: This is a simple approach - for complex migrations, consider using a proper SQL parser
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    console.log('');

    let executed = 0;
    let errors = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty or comment-only statements
      if (!statement || statement.length < 10) continue;

      try {
        // Use RPC to execute raw SQL (if available) or direct query
        const { error } = await supabase.rpc('exec_sql', { sql: statement }).catch(async () => {
          // Fallback: Try direct query execution
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sql: statement })
          });

          if (!response.ok) {
            // If RPC doesn't exist, try executing via Supabase client
            // For now, we'll need to use a different approach
            throw new Error('RPC not available');
          }

          return await response.json();
        });

        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          errors++;
        } else {
          executed++;
          if ((i + 1) % 5 === 0) {
            console.log(`✅ Executed ${i + 1}/${statements.length} statements...`);
          }
        }
      } catch (err) {
        // If RPC doesn't work, we'll need to execute via Supabase Dashboard
        console.log('');
        console.log('⚠️  Cannot execute migration via API (RPC not available)');
        console.log('');
        console.log('📋 Please run this migration manually:');
        console.log('   1. Go to: https://supabase.com/dashboard/project/nneyhfhdthpxmkemyenm/sql');
        console.log('   2. Click "New Query"');
        console.log('   3. Copy the contents of:');
        console.log(`      ${migrationPath}`);
        console.log('   4. Paste and click "Run"');
        console.log('');
        process.exit(0);
      }
    }

    console.log('');
    console.log('='.repeat(60));
    if (errors === 0) {
      console.log(`✅ Migration completed successfully!`);
      console.log(`   Executed: ${executed} statements`);
      console.log('');
      console.log('📊 Verification:');
      console.log('   Check if these tables/views exist:');
      console.log('   - document_request_status_history');
      console.log('   - document_request_status_summary (view)');
    } else {
      console.log(`⚠️  Migration completed with ${errors} errors`);
      console.log(`   Executed: ${executed} statements`);
      console.log('   Please review errors above and fix if needed');
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('📋 Manual Migration Instructions:');
    console.error('   1. Go to: https://supabase.com/dashboard/project/nneyhfhdthpxmkemyenm/sql');
    console.error('   2. Click "New Query"');
    console.error('   3. Copy the contents of:');
    console.error('      supabase/migrations/20250106000000_add_document_request_status_tracking.sql');
    console.error('   4. Paste and click "Run"');
    console.error('');
    process.exit(1);
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('');
    console.log('✅ Next step: Redeploy Edge Function');
    console.log('   Run: npx supabase@beta functions deploy process-emails --use-api');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

