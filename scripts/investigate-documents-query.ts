#!/usr/bin/env tsx
/**
 * Investigate why documents aren't appearing on the documents page
 * This script checks for documents that exist but may be filtered out by RLS or foreign key issues
 * Usage: npx tsx scripts/investigate-documents-query.ts
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

async function investigateDocumentsQuery() {
  console.log('🔍 Investigating Documents Query Issue\n');

  // 1. Get all documents (using service role to bypass RLS)
  const { data: allDocuments, error: allDocsError } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (allDocsError) {
    console.error('❌ Error fetching all documents:', allDocsError);
    return;
  }

  console.log(`1️⃣ Total documents found (service role): ${allDocuments?.length || 0}\n`);

  if (!allDocuments || allDocuments.length === 0) {
    console.log('⚠️  No documents found in database. The issue may be that documents are not being created.\n');
    return;
  }

  // 2. Check for documents with invalid foreign keys
  console.log('2️⃣ Checking for documents with invalid foreign keys:\n');
  
  for (const doc of allDocuments.slice(0, 10)) {
    const issues: string[] = [];

    // Check document_request_id
    if (doc.document_request_id) {
      const { data: request, error: requestError } = await supabase
        .from('document_requests')
        .select('id, organization_id')
        .eq('id', doc.document_request_id)
        .single();

      if (requestError || !request) {
        issues.push(`❌ Invalid document_request_id: ${doc.document_request_id} (referenced record not found)`);
      } else if (request.organization_id !== doc.organization_id) {
        issues.push(`⚠️  document_request_id organization mismatch: doc org=${doc.organization_id}, request org=${request.organization_id}`);
      }
    }

    // Check routing_rule_id
    if (doc.routing_rule_id) {
      const { data: rule, error: ruleError } = await supabase
        .from('routing_rules')
        .select('id, organization_id')
        .eq('id', doc.routing_rule_id)
        .single();

      if (ruleError || !rule) {
        issues.push(`❌ Invalid routing_rule_id: ${doc.routing_rule_id} (referenced record not found)`);
      } else if (rule.organization_id !== doc.organization_id) {
        issues.push(`⚠️  routing_rule_id organization mismatch: doc org=${doc.organization_id}, rule org=${rule.organization_id}`);
      }
    }

    if (issues.length > 0) {
      console.log(`   Document: ${doc.original_filename} (${doc.id})`);
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('');
    }
  }

  // 3. Test query with joins (simulating the documents page query)
  console.log('3️⃣ Testing query with foreign key joins:\n');
  
  if (allDocuments.length > 0) {
    const testDoc = allDocuments[0];
    const testOrgId = testDoc.organization_id;

    // Test query WITH joins (like the documents page)
    const { data: docsWithJoins, error: joinsError } = await supabase
      .from('documents')
      .select(`
        *,
        document_requests:document_request_id (
          id,
          subject,
          recipient_email,
          status
        ),
        routing_rules:routing_rule_id (
          id,
          name
        )
      `)
      .eq('organization_id', testOrgId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (joinsError) {
      console.log(`   ❌ Query with joins failed: ${joinsError.message}`);
      console.log(`   Error code: ${joinsError.code}`);
      console.log(`   Error details: ${JSON.stringify(joinsError, null, 2)}\n`);
    } else {
      console.log(`   ✅ Query with joins succeeded: ${docsWithJoins?.length || 0} documents returned\n`);
    }

    // Test query WITHOUT joins
    const { data: docsWithoutJoins, error: noJoinsError } = await supabase
      .from('documents')
      .select('*')
      .eq('organization_id', testOrgId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (noJoinsError) {
      console.log(`   ❌ Query without joins failed: ${noJoinsError.message}\n`);
    } else {
      console.log(`   ✅ Query without joins succeeded: ${docsWithoutJoins?.length || 0} documents returned\n`);
      
      if (docsWithJoins && docsWithoutJoins) {
        const diff = docsWithoutJoins.length - docsWithJoins.length;
        if (diff > 0) {
          console.log(`   ⚠️  ${diff} document(s) are being filtered out by the join query!\n`);
          
          // Find which documents are missing
          const withJoinsIds = new Set(docsWithJoins.map(d => d.id));
          const missing = docsWithoutJoins.filter(d => !withJoinsIds.has(d.id));
          
          console.log('   Documents filtered out:');
          missing.forEach(doc => {
            console.log(`     - ${doc.original_filename} (${doc.id})`);
            console.log(`       document_request_id: ${doc.document_request_id || 'null'}`);
            console.log(`       routing_rule_id: ${doc.routing_rule_id || 'null'}`);
          });
          console.log('');
        }
      }
    }
  }

  // 4. Check RLS policies
  console.log('4️⃣ Checking RLS policy access:\n');
  
  if (allDocuments.length > 0) {
    const testDoc = allDocuments[0];
    
    // Try to access related document_request (if exists)
    if (testDoc.document_request_id) {
      const { data: request, error: requestError } = await supabase
        .from('document_requests')
        .select('id, subject, organization_id')
        .eq('id', testDoc.document_request_id)
        .single();

      if (requestError) {
        console.log(`   ⚠️  Cannot access document_request ${testDoc.document_request_id}: ${requestError.message}`);
      } else {
        console.log(`   ✅ Can access document_request: ${request.subject}`);
      }
    }

    // Try to access related routing_rule (if exists)
    if (testDoc.routing_rule_id) {
      const { data: rule, error: ruleError } = await supabase
        .from('routing_rules')
        .select('id, name, organization_id')
        .eq('id', testDoc.routing_rule_id)
        .single();

      if (ruleError) {
        console.log(`   ⚠️  Cannot access routing_rule ${testDoc.routing_rule_id}: ${ruleError.message}`);
      } else {
        console.log(`   ✅ Can access routing_rule: ${rule.name}`);
      }
    }
    console.log('');
  }

  // 5. Summary
  console.log('📋 Summary:\n');
  console.log(`   Total documents in database: ${allDocuments?.length || 0}`);
  
  if (allDocuments && allDocuments.length > 0) {
    const withRequest = allDocuments.filter(d => d.document_request_id).length;
    const withRule = allDocuments.filter(d => d.routing_rule_id).length;
    console.log(`   Documents with document_request_id: ${withRequest}`);
    console.log(`   Documents with routing_rule_id: ${withRule}`);
  }

  console.log('\n💡 Recommendations:');
  console.log('   1. If documents exist but query with joins returns fewer results, RLS on joined tables may be blocking access');
  console.log('   2. If foreign keys reference deleted records, the join will fail silently');
  console.log('   3. Consider making the foreign key joins optional or handling null foreign keys gracefully');
  console.log('   4. Add better error handling to the documents page to surface query errors\n');
}

investigateDocumentsQuery().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

