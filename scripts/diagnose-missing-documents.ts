#!/usr/bin/env tsx
/**
 * Diagnose why documents aren't being created from emails
 * Usage: npx tsx scripts/diagnose-missing-documents.ts
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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseMissingDocuments() {
  console.log('🔍 Diagnosing Missing Documents Issue\n');

  // 1. Check total documents
  const { count: totalDocs } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });
  console.log(`1️⃣ Total documents in database: ${totalDocs || 0}\n`);

  // 2. Check requests that should have documents
  const { data: requests, error: requestsError } = await supabase
    .from('document_requests')
    .select('id, subject, recipient_email, status, document_count, created_at')
    .eq('recipient_email', 'bullseye.piyush@gmail.com')
    .eq('status', 'received')
    .order('created_at', { ascending: false });

  if (requestsError) {
    console.error('❌ Error:', requestsError);
    return;
  }

  console.log(`2️⃣ Document requests for bullseye.piyush@gmail.com (status: received):`);
  if (!requests || requests.length === 0) {
    console.log('   ⚠️  No requests found\n');
  } else {
    console.log(`   Found ${requests.length} request(s):\n`);
    requests.forEach((req) => {
      console.log(`   - ${req.subject}`);
      console.log(`     ID: ${req.id}`);
      console.log(`     Document count: ${req.document_count || 0}`);
      console.log(`     Created: ${new Date(req.created_at).toLocaleString()}\n`);
    });
  }

  // 3. Check for any documents from that sender
  const { data: docs, error: docsError } = await supabase
    .from('documents')
    .select('id, original_filename, sender_email, storage_provider, upload_verification_status, created_at')
    .ilike('sender_email', '%bullseye.piyush%')
    .order('created_at', { ascending: false });

  console.log(`3️⃣ Documents from bullseye.piyush@gmail.com:`);
  if (docsError) {
    console.error('   ❌ Error:', docsError);
  } else if (!docs || docs.length === 0) {
    console.log('   ⚠️  No documents found from this sender\n');
  } else {
    console.log(`   Found ${docs.length} document(s):\n`);
    docs.forEach((doc) => {
      console.log(`   - ${doc.original_filename}`);
      console.log(`     Status: ${doc.upload_verification_status || 'pending'}`);
      console.log(`     Provider: ${doc.storage_provider}`);
      console.log(`     Created: ${new Date(doc.created_at).toLocaleString()}\n`);
    });
  }

  // 4. Check activity logs
  const { data: activities, error: activityError } = await supabase
    .from('activity_logs')
    .select('action, resource_type, details, created_at')
    .in('action', ['upload', 'upload_failed'])
    .order('created_at', { ascending: false })
    .limit(10);

  console.log(`4️⃣ Recent upload activity:`);
  if (activityError) {
    console.error('   ❌ Error:', activityError);
  } else if (!activities || activities.length === 0) {
    console.log('   ⚠️  No upload activity found\n');
    console.log('   This suggests attachments are not being processed.\n');
  } else {
    console.log(`   Found ${activities.length} activity log(s):\n`);
    activities.forEach((act: any) => {
      const details = act.details || {};
      console.log(`   - ${act.action}: ${details.filename || 'Unknown'}`);
      if (details.error) {
        console.log(`     Error: ${details.error}`);
      }
      console.log(`     Time: ${new Date(act.created_at).toLocaleString()}\n`);
    });
  }

  // 5. Check email account sync status
  const { data: accounts, error: accountsError } = await supabase
    .from('email_accounts')
    .select('email, provider, is_active, last_sync_at')
    .eq('is_active', true);

  console.log(`5️⃣ Active email accounts:`);
  if (accountsError) {
    console.error('   ❌ Error:', accountsError);
  } else if (!accounts || accounts.length === 0) {
    console.log('   ⚠️  No active email accounts\n');
  } else {
    accounts.forEach((acc) => {
      const syncTime = acc.last_sync_at 
        ? new Date(acc.last_sync_at).toLocaleString()
        : 'Never';
      const minutesAgo = acc.last_sync_at
        ? Math.floor((Date.now() - new Date(acc.last_sync_at).getTime()) / 60000)
        : null;
      console.log(`   - ${acc.email} (${acc.provider})`);
      const syncInfo = minutesAgo ? ` (${minutesAgo} minutes ago)` : '';
      console.log(`     Last sync: ${syncTime}${syncInfo}\n`);
    });
  }

  // 6. Check storage configuration
  const { data: storage, error: storageError } = await supabase
    .from('storage_configs')
    .select('id, name, provider, is_default, is_active')
    .eq('is_active', true);

  console.log(`6️⃣ Storage configurations:`);
  if (storageError) {
    console.error('   ❌ Error:', storageError);
  } else if (!storage || storage.length === 0) {
    console.log('   ⚠️  No active storage configurations');
    console.log('   ⚠️  This could be why documents are not being uploaded!\n');
  } else {
    storage.forEach((s) => {
      console.log(`   - ${s.name} (${s.provider})${s.is_default ? ' [DEFAULT]' : ''}\n`);
    });
  }

  // 7. Summary and recommendations
  console.log('\n📋 Diagnosis Summary:');
  console.log(`   Total documents: ${totalDocs || 0}`);
  console.log(`   Requests with status 'received': ${requests?.length || 0}`);
  console.log(`   Documents from sender: ${docs?.length || 0}`);
  console.log(`   Upload activities: ${activities?.length || 0}`);

  console.log('\n💡 Possible Issues:');
  if ((totalDocs || 0) === 0 && (activities?.length || 0) === 0) {
    console.log('   1. ⚠️  No documents created - attachments may not be detected');
    console.log('   2. ⚠️  Check Edge Function logs for attachment processing errors');
    console.log('   3. ⚠️  Verify email account can access attachments');
    console.log('   4. ⚠️  Check if emails actually have attachments (not inline images)');
  }
  
  if ((requests?.length || 0) > 0 && (docs?.length || 0) === 0) {
    console.log('   1. ⚠️  Emails processed but no documents created');
    console.log('   2. ⚠️  Attachments may have failed to upload');
    console.log('   3. ⚠️  Check upload_error column in documents table');
    console.log('   4. ⚠️  Verify storage configuration is valid');
  }

  console.log('\n🔧 Next Steps:');
  console.log('   1. Check Supabase Edge Function logs for process-emails');
  console.log('   2. Verify email account has access to read attachments');
  console.log('   3. Test storage connection: /api/storage/[id]/test-connection');
  console.log('   4. Manually trigger email processing and check logs');
  console.log('   5. Send a test email with attachment and monitor processing\n');
}

diagnoseMissingDocuments().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

