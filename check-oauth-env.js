#!/usr/bin/env node

/**
 * Quick script to check OAuth environment configuration
 * Run: node check-oauth-env.js
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Checking OAuth Environment Configuration\n');
console.log('=' .repeat(60));

const envPath = join(__dirname, 'apps/web/.env.local');

let envVars = {};
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      envVars[key.trim()] = value.trim();
    }
  });
} catch (error) {
  console.error(`❌ Could not read ${envPath}`);
  console.error('   Make sure the file exists!\n');
  process.exit(1);
}

// Check Microsoft OAuth
console.log('\n📧 Microsoft OAuth Configuration:');
console.log('-'.repeat(60));
const microsoftChecks = {
  'MICROSOFT_CLIENT_ID': envVars.MICROSOFT_CLIENT_ID,
  'MICROSOFT_CLIENT_SECRET': envVars.MICROSOFT_CLIENT_SECRET,
  'MICROSOFT_REDIRECT_URI': envVars.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/auth/microsoft/callback',
};

let microsoftOk = true;
for (const [key, value] of Object.entries(microsoftChecks)) {
  if (value && value !== 'your_microsoft_client_id' && value !== 'your_microsoft_client_secret') {
    const displayValue = key.includes('SECRET') ? '***' + value.slice(-4) : value;
    console.log(`✅ ${key}: ${displayValue}`);
  } else {
    console.log(`❌ ${key}: Missing or placeholder value`);
    microsoftOk = false;
  }
}

// Check Encryption Key
console.log('\n🔐 Encryption Configuration:');
console.log('-'.repeat(60));
const encryptionKey = envVars.ENCRYPTION_KEY || envVars.NEXT_PUBLIC_ENCRYPTION_KEY;
if (encryptionKey && encryptionKey !== 'default-key-change-in-production') {
  console.log(`✅ ENCRYPTION_KEY: Set (length: ${encryptionKey.length})`);
} else {
  console.log(`❌ ENCRYPTION_KEY: Missing or using default value`);
  console.log(`   This is REQUIRED for storing OAuth tokens!`);
}

// Summary
console.log('\n' + '='.repeat(60));
if (microsoftOk && encryptionKey && encryptionKey !== 'default-key-change-in-production') {
  console.log('✅ All required OAuth configuration looks good!');
  console.log('\nIf OAuth is still failing, check:');
  console.log('1. Server console logs for detailed error messages');
  console.log('2. Azure Portal: App registration redirect URI matches exactly');
  console.log('3. Azure Portal: API permissions are granted');
} else {
  console.log('❌ Configuration issues found!');
  console.log('\nPlease fix the issues above and restart your dev server.');
}

console.log('\n');

