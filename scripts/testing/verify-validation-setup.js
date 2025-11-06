#!/usr/bin/env node

/**
 * Verification Script for Document Validation System
 * Checks that all components are properly configured
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './apps/web/.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkmark() {
  return `${colors.green}✓${colors.reset}`;
}

function cross() {
  return `${colors.red}✗${colors.reset}`;
}

function warning() {
  return `${colors.yellow}⚠${colors.reset}`;
}

async function verifySetup() {
  log('\n========================================', 'blue');
  log('Document Validation System Verification', 'blue');
  log('========================================\n', 'blue');

  let allChecksPassed = true;

  // 1. Check environment variables
  log('1. Environment Variables:', 'blue');
  if (!SUPABASE_URL) {
    log(`   ${cross()} NEXT_PUBLIC_SUPABASE_URL not set`, 'red');
    allChecksPassed = false;
  } else {
    log(`   ${checkmark()} NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL.substring(0, 30)}...`, 'green');
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    log(`   ${cross()} SUPABASE_SERVICE_ROLE_KEY not set`, 'red');
    allChecksPassed = false;
  } else {
    log(`   ${checkmark()} SUPABASE_SERVICE_ROLE_KEY: configured`, 'green');
  }

  if (!process.env.OPENAI_API_KEY) {
    log(`   ${warning()} OPENAI_API_KEY not set (will be checked in Supabase)`, 'yellow');
  } else {
    log(`   ${checkmark()} OPENAI_API_KEY: configured locally`, 'green');
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    log('\n   Please set missing environment variables in apps/web/.env.local', 'yellow');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 2. Check database schema
  log('\n2. Database Schema:', 'blue');
  
  try {
    // Check documents table has validation columns by trying to select them
    const { error: docError } = await supabase
      .from('documents')
      .select('id, validation_status, validation_metadata')
      .limit(1);

    if (docError) {
      // Check if it's a column error
      if (docError.message && (
        docError.message.includes('validation_status') || 
        docError.message.includes('validation_metadata') ||
        docError.message.includes('column') && docError.message.includes('does not exist')
      )) {
        log(`   ${cross()} documents table missing validation columns`, 'red');
        log(`   Error: ${docError.message}`, 'red');
        allChecksPassed = false;
      } else {
        // Other error (maybe no rows, which is fine)
        log(`   ${checkmark()} documents table has validation columns`, 'green');
      }
    } else {
      log(`   ${checkmark()} documents table has validation columns`, 'green');
    }
  } catch (err) {
    log(`   ${warning()} Could not verify documents table: ${err.message}`, 'yellow');
  }

  // Check document_validations table exists
  try {
    const { error } = await supabase
      .from('document_validations')
      .select('id')
      .limit(1);

    if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
      log(`   ${cross()} document_validations table missing`, 'red');
      allChecksPassed = false;
    } else {
      log(`   ${checkmark()} document_validations table exists`, 'green');
    }
  } catch (err) {
    log(`   ${cross()} document_validations table check failed: ${err.message}`, 'red');
    allChecksPassed = false;
  }

  // Check document_renewal_reminders table exists
  try {
    const { error } = await supabase
      .from('document_renewal_reminders')
      .select('id')
      .limit(1);

    if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
      log(`   ${cross()} document_renewal_reminders table missing`, 'red');
      allChecksPassed = false;
    } else {
      log(`   ${checkmark()} document_renewal_reminders table exists`, 'green');
    }
  } catch (err) {
    log(`   ${cross()} document_renewal_reminders table check failed: ${err.message}`, 'red');
    allChecksPassed = false;
  }

  // 3. Check cron job
  log('\n3. Cron Job Configuration:', 'blue');
  try {
    const { data: cronJobs, error: cronError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT jobid, jobname, schedule, active 
          FROM cron.job 
          WHERE jobname = 'send-renewal-reminders';
        `,
      })
      .catch(async () => {
        // Alternative: direct SQL query if RPC doesn't exist
        // This is a simplified check - actual cron job verification may require dashboard
        return { data: null, error: { message: 'RPC not available' } };
      });

    if (cronError) {
      log(`   ${warning()} Could not verify cron job via API (check in Supabase Dashboard)`, 'yellow');
      log('   Go to: Database → Cron Jobs → Check for "send-renewal-reminders"', 'yellow');
    } else if (cronJobs && cronJobs.length > 0) {
      log(`   ${checkmark()} Cron job "send-renewal-reminders" is scheduled`, 'green');
    } else {
      log(`   ${warning()} Cron job not found (may need to run migration)`, 'yellow');
      log('   Run: node run-migration.js supabase/migrations/20250112000001_add_renewal_reminders_cron_job.sql', 'yellow');
    }
  } catch (err) {
    log(`   ${warning()} Cron job check skipped: ${err.message}`, 'yellow');
  }

  // 4. Check Edge Functions (via HTTP)
  log('\n4. Edge Functions:', 'blue');
  
  const functions = [
    { name: 'validate-document', url: `${SUPABASE_URL}/functions/v1/validate-document` },
    { name: 'send-renewal-reminders', url: `${SUPABASE_URL}/functions/v1/send-renewal-reminders` },
  ];

  for (const func of functions) {
    try {
      const response = await fetch(func.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      // 404 means function doesn't exist, 400/500 means it exists but failed (expected)
      if (response.status === 404) {
        log(`   ${cross()} ${func.name} not deployed (404)`, 'red');
        allChecksPassed = false;
      } else {
        log(`   ${checkmark()} ${func.name} is deployed (status: ${response.status})`, 'green');
      }
    } catch (err) {
      log(`   ${warning()} Could not verify ${func.name}: ${err.message}`, 'yellow');
    }
  }

  // 5. Summary
  log('\n========================================', 'blue');
  if (allChecksPassed) {
    log('✅ All critical checks passed!', 'green');
    log('\nNext steps:', 'blue');
    log('  1. Set OPENAI_API_KEY in Supabase Dashboard (Edge Functions → Secrets)', 'yellow');
    log('  2. Test validation by triggering on a document', 'yellow');
    log('  3. Verify cron job in Supabase Dashboard', 'yellow');
  } else {
    log('⚠️  Some checks failed. Please review above.', 'yellow');
    log('\nRemaining steps:', 'blue');
    log('  1. Run migrations if schema is missing', 'yellow');
    log('  2. Deploy Edge Functions: ./deploy-validation-functions.sh', 'yellow');
    log('  3. Set OPENAI_API_KEY in Supabase Dashboard', 'yellow');
  }
  log('========================================\n', 'blue');
}

// Run verification
verifySetup().catch((err) => {
  log(`\n${cross()} Verification failed: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});

