#!/usr/bin/env tsx
/**
 * Manual test script to trigger email processing and verify uploads
 * Usage: npx tsx scripts/test-email-processing.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('   Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testEmailProcessing() {
  console.log('🧪 Testing Email Processing Pipeline\n');

  // Step 1: Check active email accounts
  console.log('1️⃣ Checking active email accounts...');
  const { data: accounts, error: accountsError } = await supabase
    .from('email_accounts')
    .select('id, email, provider, is_active, last_sync_at')
    .eq('is_active', true);

  if (accountsError) {
    console.error('❌ Error fetching accounts:', accountsError);
    return;
  }

  if (!accounts || accounts.length === 0) {
    console.log('⚠️  No active email accounts found');
    return;
  }

  console.log(`✅ Found ${accounts.length} active email account(s):`);
  accounts.forEach((acc) => {
    console.log(`   - ${acc.email} (${acc.provider}) - Last sync: ${acc.last_sync_at || 'Never'}`);
  });

  // Step 2: Check storage configurations
  console.log('\n2️⃣ Checking storage configurations...');
  const { data: storageConfigs, error: storageError } = await supabase
    .from('storage_configs')
    .select('id, name, provider, is_default, is_active')
    .eq('is_active', true);

  if (storageError) {
    console.error('❌ Error fetching storage configs:', storageError);
    return;
  }

  if (!storageConfigs || storageConfigs.length === 0) {
    console.log('⚠️  No active storage configurations found');
    return;
  }

  const defaultStorage = storageConfigs.find((s) => s.is_default);
  console.log(`✅ Found ${storageConfigs.length} storage configuration(s):`);
  storageConfigs.forEach((s) => {
    console.log(`   - ${s.name} (${s.provider})${s.is_default ? ' [DEFAULT]' : ''}`);
  });

  if (!defaultStorage) {
    console.log('⚠️  No default storage configuration found');
  }

  // Step 3: Trigger email processing
  console.log('\n3️⃣ Triggering email processing...');
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/process-emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Email processing failed:', result);
      return;
    }

    console.log('✅ Email processing completed');
    console.log(`   Processed: ${result.processed || 0} emails`);
    console.log(`   Errors: ${result.errors || 0}`);
    console.log(`   Duration: ${result.duration_ms || 0}ms`);

    if (result.account_results && result.account_results.length > 0) {
      console.log('\n   Account Results:');
      result.account_results.forEach((accResult: any) => {
        console.log(`   - ${accResult.accountEmail}: ${accResult.processed} processed, ${accResult.errors} errors`);
        if (accResult.errorDetails && accResult.errorDetails.length > 0) {
          accResult.errorDetails.forEach((err: string) => {
            console.log(`     ❌ ${err}`);
          });
        }
      });
    }
  } catch (error: any) {
    console.error('❌ Error triggering email processing:', error.message);
    return;
  }

  // Step 4: Check recent documents
  console.log('\n4️⃣ Checking recent documents...');
  const { data: documents, error: docsError } = await supabase
    .from('documents')
    .select('id, original_filename, storage_provider, upload_verification_status, upload_error, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (docsError) {
    console.error('❌ Error fetching documents:', docsError);
    return;
  }

  if (!documents || documents.length === 0) {
    console.log('⚠️  No documents found');
    return;
  }

  console.log(`✅ Found ${documents.length} recent document(s):`);
  documents.forEach((doc) => {
    const status = doc.upload_verification_status || 'pending';
    const statusIcon = status === 'verified' ? '✅' : status === 'failed' ? '❌' : '⏳';
    console.log(`   ${statusIcon} ${doc.original_filename} (${doc.storage_provider}) - ${status}`);
    if (doc.upload_error) {
      console.log(`      Error: ${doc.upload_error}`);
    }
  });

  // Step 5: Summary
  console.log('\n📊 Summary:');
  const verifiedCount = documents.filter((d) => d.upload_verification_status === 'verified').length;
  const failedCount = documents.filter((d) => d.upload_verification_status === 'failed').length;
  const pendingCount = documents.filter((d) => !d.upload_verification_status || d.upload_verification_status === 'pending').length;

  console.log(`   Verified: ${verifiedCount}`);
  console.log(`   Failed: ${failedCount}`);
  console.log(`   Pending: ${pendingCount}`);

  if (failedCount > 0) {
    console.log('\n⚠️  Some uploads failed. Check the error messages above.');
  } else if (verifiedCount > 0) {
    console.log('\n✅ All recent uploads verified successfully!');
  }
}

testEmailProcessing().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

