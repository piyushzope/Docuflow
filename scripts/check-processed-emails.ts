#!/usr/bin/env tsx
/**
 * Check processed emails and related data
 * Usage: npx tsx scripts/check-processed-emails.ts
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

async function checkProcessedEmails() {
  console.log('📧 Checking Processed Emails\n');

  // 1. Check email accounts
  console.log('1️⃣ Email Accounts:');
  const { data: accounts, error: accountsError } = await supabase
    .from('email_accounts')
    .select('id, email, provider, is_active, last_sync_at')
    .order('last_sync_at', { ascending: false, nullsFirst: false });

  if (accountsError) {
    console.error('❌ Error:', accountsError);
    return;
  }

  if (!accounts || accounts.length === 0) {
    console.log('   ⚠️  No email accounts found\n');
  } else {
    accounts.forEach((acc) => {
      const syncStatus = acc.last_sync_at 
        ? `Last sync: ${new Date(acc.last_sync_at).toLocaleString()}`
        : 'Never synced';
      console.log(`   ${acc.is_active ? '✅' : '❌'} ${acc.email} (${acc.provider}) - ${syncStatus}`);
    });
    console.log('');
  }

  // 2. Check recent documents
  console.log('2️⃣ Recent Documents (last 20):');
  const { data: documents, error: docsError } = await supabase
    .from('documents')
    .select('id, original_filename, sender_email, storage_provider, upload_verification_status, upload_error, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (docsError) {
    console.error('❌ Error:', docsError);
  } else if (!documents || documents.length === 0) {
    console.log('   ⚠️  No documents found\n');
  } else {
    documents.forEach((doc) => {
      const status = doc.upload_verification_status || 'pending';
      const statusIcon = status === 'verified' ? '✅' : status === 'failed' ? '❌' : status === 'not_found' ? '⚠️' : '⏳';
      console.log(`   ${statusIcon} ${doc.original_filename || 'Unknown'}`);
      console.log(`      From: ${doc.sender_email} | Provider: ${doc.storage_provider} | Status: ${status}`);
      if (doc.upload_error) {
        console.log(`      Error: ${doc.upload_error}`);
      }
      console.log(`      Created: ${new Date(doc.created_at).toLocaleString()}\n`);
    });
  }

  // 3. Check activity logs
  console.log('3️⃣ Recent Activity Logs (uploads):');
  const { data: activities, error: activityError } = await supabase
    .from('activity_logs')
    .select('action, resource_type, details, user_id, created_at')
    .in('action', ['upload', 'upload_failed', 'verify_upload'])
    .order('created_at', { ascending: false })
    .limit(10);

  if (activityError) {
    console.error('❌ Error:', activityError);
  } else if (!activities || activities.length === 0) {
    console.log('   ⚠️  No upload activity found\n');
  } else {
    activities.forEach((activity: any) => {
      const details = activity.details || {};
      const filename = details.filename || 'Unknown';
      const icon = activity.action === 'upload_failed' ? '❌' : activity.action === 'verify_upload' ? '🔍' : '✅';
      console.log(`   ${icon} ${activity.action}: ${filename}`);
      if (details.error) {
        console.log(`      Error: ${details.error}`);
      }
      if (details.verification_status) {
        console.log(`      Verification: ${details.verification_status}`);
      }
      console.log(`      Time: ${new Date(activity.created_at).toLocaleString()}\n`);
    });
  }

  // 4. Summary statistics
  console.log('4️⃣ Summary Statistics (last 24 hours):');
  const { data: summary, error: summaryError } = await supabase
    .from('documents')
    .select('upload_verification_status, upload_error')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (!summaryError && summary) {
    const total = summary.length;
    const verified = summary.filter((d: any) => d.upload_verification_status === 'verified').length;
    const pending = summary.filter((d: any) => !d.upload_verification_status || d.upload_verification_status === 'pending').length;
    const failed = summary.filter((d: any) => d.upload_verification_status === 'failed').length;
    const notFound = summary.filter((d: any) => d.upload_verification_status === 'not_found').length;
    const withErrors = summary.filter((d: any) => d.upload_error).length;

    console.log(`   Total documents: ${total}`);
    console.log(`   ✅ Verified: ${verified}`);
    console.log(`   ⏳ Pending: ${pending}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⚠️  Not Found: ${notFound}`);
    console.log(`   🔴 With Errors: ${withErrors}\n`);
  }

  // 5. Check for upload errors
  console.log('5️⃣ Documents with Upload Errors:');
  const { data: errorDocs, error: errorDocsError } = await supabase
    .from('documents')
    .select('original_filename, upload_error, upload_verification_status, created_at')
    .or('upload_error.not.is.null,upload_verification_status.eq.failed,upload_verification_status.eq.not_found')
    .order('created_at', { ascending: false })
    .limit(10);

  if (errorDocsError) {
    console.error('❌ Error:', errorDocsError);
  } else if (!errorDocs || errorDocs.length === 0) {
    console.log('   ✅ No upload errors found\n');
  } else {
    errorDocs.forEach((doc: any) => {
      console.log(`   ❌ ${doc.original_filename || 'Unknown'}`);
      console.log(`      Status: ${doc.upload_verification_status}`);
      if (doc.upload_error) {
        console.log(`      Error: ${doc.upload_error}`);
      }
      console.log(`      Created: ${new Date(doc.created_at).toLocaleString()}\n`);
    });
  }
}

checkProcessedEmails().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

