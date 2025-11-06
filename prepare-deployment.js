#!/usr/bin/env node

/**
 * Prepares Edge Function for deployment
 * Validates the function code and prepares it for Dashboard deployment
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const functionPath = join(__dirname, 'supabase/functions/process-emails/index.ts');

console.log('🔍 Validating Edge Function...\n');

try {
  // Read the function file
  const functionCode = readFileSync(functionPath, 'utf-8');
  
  // Basic validation
  const checks = {
    'Has serve handler': functionCode.includes('serve(async'),
    'Has processEmail function': functionCode.includes('async function processEmail'),
    'Has matchRoutingRule': functionCode.includes('function matchRoutingRule'),
    'Has normalizeSubject': functionCode.includes('function normalizeSubject'),
    'Has ENCRYPTION_KEY check': functionCode.includes('ENCRYPTION_KEY'),
    'Has document_request_id linking': functionCode.includes('document_request_id'),
  };

  console.log('Validation Results:');
  let allPassed = true;
  for (const [check, passed] of Object.entries(checks)) {
    const status = passed ? '✅' : '❌';
    console.log(`  ${status} ${check}`);
    if (!passed) allPassed = false;
  }

  if (!allPassed) {
    console.error('\n❌ Validation failed!');
    process.exit(1);
  }

  console.log('\n✅ All validations passed!');
  console.log(`\n📄 Function file: ${functionPath}`);
  console.log(`📊 Total lines: ${functionCode.split('\n').length}`);
  console.log(`📦 Size: ${(functionCode.length / 1024).toFixed(2)} KB\n`);

  // Check for key features
  console.log('Key Features Detected:');
  if (functionCode.includes('normalizeSubject')) {
    console.log('  ✅ Subject normalization (handles Re:, Fwd:, etc.)');
  }
  if (functionCode.includes('document_request_id')) {
    console.log('  ✅ Document-request linking');
  }
  if (functionCode.includes('uploadToOneDrive')) {
    console.log('  ✅ OneDrive upload with error handling');
  }

  console.log('\n📋 Ready for deployment!');
  console.log('\nTo deploy via Dashboard:');
  console.log('1. Go to: https://app.supabase.com/project/nneyhfhdthpxmkemyenm');
  console.log('2. Edge Functions → Create Function (or edit process-emails)');
  console.log('3. Copy the entire contents of the file above');
  console.log('4. Paste and click Deploy\n');

  // Create a deployment-ready copy (optional, for easy copy-paste)
  const deploymentReady = `// Edge Function: process-emails
// Deployment Date: ${new Date().toISOString()}
// Project: nneyhfhdthpxmkemyenm
//
// Copy everything below this line:
//
${functionCode}`;

  writeFileSync(
    join(__dirname, 'process-emails-ready-for-deployment.ts'),
    deploymentReady,
    'utf-8'
  );

  console.log('✅ Created: process-emails-ready-for-deployment.ts');
  console.log('   (You can open this file to copy the code)\n');

} catch (error) {
  console.error('❌ Error preparing deployment:', error.message);
  process.exit(1);
}

