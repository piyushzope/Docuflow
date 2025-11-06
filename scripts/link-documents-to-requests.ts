#!/usr/bin/env tsx
/**
 * Link existing documents to their corresponding document requests
 * Usage: npx tsx scripts/link-documents-to-requests.ts [--dry-run]
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
const dryRun = process.argv.includes('--dry-run');

// Normalize subject (remove Re:, Fwd:, etc.)
function normalizeSubject(subject: string): string {
  if (!subject) return '';
  return subject
    .replace(/^(re|fwd|fw|fwd:re|re:fwd|re:fw|fwd:fw):\s*/gi, '')
    .replace(/^\[.*?\]\s*/g, '')
    .trim();
}

async function linkDocumentsToRequests() {
  console.log('🔗 Linking Documents to Requests\n');
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Get all documents without request links that have email metadata
  const { data: documents, error: docsError } = await supabase
    .from('documents')
    .select('id, original_filename, sender_email, organization_id, created_at, metadata')
    .is('document_request_id', null)
    .not('metadata->email_subject', 'is', null);

  if (docsError) {
    console.error('❌ Error fetching documents:', docsError);
    return;
  }

  if (!documents || documents.length === 0) {
    console.log('✅ No unlinked documents found\n');
    return;
  }

  console.log(`Found ${documents.length} unlinked document(s) to check\n`);

  let linked = 0;
  let notFound = 0;
  let errors = 0;

  for (const doc of documents) {
    const emailSubject = (doc.metadata as any)?.email_subject || '';
    const normalizedEmailSubject = normalizeSubject(emailSubject);

    // Find matching requests
    const { data: requests, error: requestsError } = await supabase
      .from('document_requests')
      .select('id, subject, recipient_email, status, organization_id')
      .eq('organization_id', doc.organization_id)
      .in('status', ['pending', 'sent', 'received', 'verifying'])
      .ilike('recipient_email', doc.sender_email);

    if (requestsError) {
      console.error(`❌ Error fetching requests for document ${doc.id}:`, requestsError);
      errors++;
      continue;
    }

    if (!requests || requests.length === 0) {
      console.log(`⚠️  No matching request found for ${doc.original_filename}`);
      console.log(`   Sender: ${doc.sender_email}`);
      console.log(`   Subject: ${emailSubject}\n`);
      notFound++;
      continue;
    }

    // Try to match by subject
    let matchedRequest = null;
    for (const request of requests) {
      const normalizedRequestSubject = normalizeSubject(request.subject || '');
      const subjectMatches = 
        normalizedEmailSubject.toLowerCase().includes(normalizedRequestSubject.toLowerCase()) ||
        normalizedRequestSubject.toLowerCase().includes(normalizedEmailSubject.toLowerCase());

      if (subjectMatches) {
        matchedRequest = request;
        break;
      }
    }

    // If no subject match, use first request (best guess)
    if (!matchedRequest && requests.length > 0) {
      matchedRequest = requests[0];
    }

    if (matchedRequest) {
      if (dryRun) {
        console.log(`🔍 Would link: ${doc.original_filename}`);
        console.log(`   To request: ${matchedRequest.subject} (${matchedRequest.id})`);
        console.log(`   Request status: ${matchedRequest.status}\n`);
      } else {
        const { error: updateError } = await supabase
          .from('documents')
          .update({ document_request_id: matchedRequest.id })
          .eq('id', doc.id);

        if (updateError) {
          console.error(`❌ Error linking document ${doc.id}:`, updateError);
          errors++;
        } else {
          console.log(`✅ Linked: ${doc.original_filename}`);
          console.log(`   To request: ${matchedRequest.subject} (${matchedRequest.id})\n`);
          linked++;

          // Update request document count
          const { count: docCount } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('document_request_id', matchedRequest.id);

          await supabase
            .from('document_requests')
            .update({ document_count: docCount || 0 })
            .eq('id', matchedRequest.id);
        }
      }
    } else {
      console.log(`⚠️  Could not determine match for: ${doc.original_filename}`);
      console.log(`   Sender: ${doc.sender_email}`);
      console.log(`   Subject: ${emailSubject}\n`);
      notFound++;
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  if (dryRun) {
    console.log(`   Would link: ${linked}`);
    console.log(`   Would not find match: ${notFound}`);
    console.log(`   Errors: ${errors}`);
    console.log(`\n   Run without --dry-run to apply changes`);
  } else {
    console.log(`   ✅ Linked: ${linked}`);
    console.log(`   ⚠️  Not found: ${notFound}`);
    console.log(`   ❌ Errors: ${errors}`);
  }
}

linkDocumentsToRequests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

