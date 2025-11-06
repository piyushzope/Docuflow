#!/usr/bin/env node
/**
 * Quick Fix: Configure Database Settings
 * Opens browser with SQL Editor and provides instructions
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PROJECT_REF = 'nneyhfhdthpxmkemyenm';
const SQL_EDITOR_URL = `https://app.supabase.com/project/${PROJECT_REF}/sql/new`;

console.log('🔧 Quick Fix: Configure Database Settings');
console.log('');
console.log('The database settings need to be configured first.');
console.log('');
console.log('📋 Steps:');
console.log('');
console.log('1. SQL Editor will open in your browser');
console.log('2. Copy the SQL from: configure-database-settings.sql');
console.log('3. Paste into SQL Editor and click "Run"');
console.log('4. Verify you see ✅ CONFIGURED for both settings');
console.log('');
console.log('Opening SQL Editor...');
console.log('');

// Try to open browser (macOS)
try {
  await execAsync(`open "${SQL_EDITOR_URL}"`);
  console.log('✅ Browser opened!');
} catch (error) {
  console.log('⚠️  Could not open browser automatically');
  console.log('');
  console.log('Please open manually:');
  console.log(SQL_EDITOR_URL);
}

console.log('');
console.log('📄 SQL to run (also in configure-database-settings.sql):');
console.log('─'.repeat(60));

// Read and display the SQL
import fs from 'fs';
const sql = fs.readFileSync('configure-database-settings.sql', 'utf8');
console.log(sql);

console.log('─'.repeat(60));
console.log('');
console.log('After running this, you can run the full fix:');
console.log('  fix-automatic-email-processing.sql');
console.log('');

