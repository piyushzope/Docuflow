#!/usr/bin/env node

/**
 * Test script for the process-emails Edge Function
 * Tests the connection and basic functionality
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nneyhfhdthpxmkemyenm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Set it with:');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.error('  node test-edge-function.js');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testEdgeFunction() {
  console.log('🧪 Testing Edge Function Connection...\n');

  try {
    // Test 1: Check database connection
    console.log('1. Testing database connection...');
    const { data: accounts, error: dbError } = await supabase
      .from('email_accounts')
      .select('id, email, provider, is_active')
      .eq('is_active', true)
      .limit(5);

    if (dbError) {
      console.error('   ❌ Database connection failed:', dbError.message);
      return false;
    }

    console.log(`   ✅ Database connected (${accounts?.length || 0} active email accounts found)\n`);

    // Test 2: Check routing rules
    console.log('2. Testing routing rules...');
    const { data: rules, error: rulesError } = await supabase
      .from('routing_rules')
      .select('id, name, is_active, priority')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(10);

    if (rulesError) {
      console.error('   ❌ Failed to fetch routing rules:', rulesError.message);
      return false;
    }

    console.log(`   ✅ Found ${rules?.length || 0} active routing rules\n`);

    // Test 3: Check storage configs
    console.log('3. Testing storage configurations...');
    const { data: storage, error: storageError } = await supabase
      .from('storage_configs')
      .select('id, provider, is_active, is_default')
      .eq('is_active', true)
      .limit(10);

    if (storageError) {
      console.error('   ❌ Failed to fetch storage configs:', storageError.message);
      return false;
    }

    const onedriveConfigs = storage?.filter(s => s.provider === 'onedrive') || [];
    console.log(`   ✅ Found ${storage?.length || 0} active storage configs`);
    console.log(`   ✅ Found ${onedriveConfigs.length} OneDrive configs\n`);

    // Test 4: Invoke Edge Function
    console.log('4. Testing Edge Function invocation...');
    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/process-emails`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('   ❌ Edge Function returned error:', result);
      return false;
    }

    console.log('   ✅ Edge Function invoked successfully');
    console.log(`   📊 Processed: ${result.processed || 0} emails`);
    console.log(`   ❌ Errors: ${result.errors || 0}`);
    console.log(`   📧 Accounts processed: ${result.accounts_processed || 0}\n`);

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All tests passed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return true;
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error);
    return false;
  }
}

// Run tests
testEdgeFunction()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

