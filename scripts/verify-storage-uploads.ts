#!/usr/bin/env tsx
/**
 * Script to verify all documents in database exist in storage
 * Usage: npx tsx scripts/verify-storage-uploads.ts [--fix]
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
const encryptionKey = process.env.ENCRYPTION_KEY;

if (!supabaseUrl || !supabaseServiceKey || !encryptionKey) {
  console.error('❌ Missing configuration');
  console.error('   Please set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ENCRYPTION_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const fixMode = process.argv.includes('--fix');

// Simple XOR decryption (matches @docuflow/shared)
function decrypt(encryptedText: string, key: string): string {
  if (!encryptedText) return encryptedText;
  try {
    const text = atob(encryptedText);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    throw new Error('Failed to decrypt data');
  }
}

async function verifyOneDriveFile(accessToken: string, fileId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}?$select=id`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function verifyGoogleDriveFile(accessToken: string, fileId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function verifySupabaseFile(bucket: string, filePath: string): Promise<boolean> {
  try {
    const pathParts = filePath.split('/');
    const fileName = pathParts.pop() || '';
    const folderPath = pathParts.join('/');
    const { data, error } = await supabase.storage.from(bucket).list(folderPath || '', {
      search: fileName,
    });
    return !error && data && data.some((f: any) => f.name === fileName);
  } catch {
    return false;
  }
}

async function verifyStorageUploads() {
  console.log('🔍 Verifying Storage Uploads\n');

  // Get all documents with storage paths
  const { data: documents, error } = await supabase
    .from('documents')
    .select('*, storage_configs:storage_config_id (*)')
    .not('storage_path', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching documents:', error);
    return;
  }

  if (!documents || documents.length === 0) {
    console.log('⚠️  No documents found');
    return;
  }

  console.log(`Found ${documents.length} document(s) to verify\n`);

  let verified = 0;
  let notFound = 0;
  let errors = 0;
  const toUpdate: Array<{ id: string; status: string; error?: string }> = [];

  for (const doc of documents) {
    const storageConfig = (doc as any).storage_configs;
    if (!storageConfig) {
      console.log(`⚠️  Document ${doc.id}: No storage config`);
      errors++;
      continue;
    }

    const configData = storageConfig.config as any || {};
    let exists = false;
    let errorMsg: string | null = null;

    try {
      if (storageConfig.provider === 'onedrive') {
        const accessToken = configData.encrypted_access_token
          ? decrypt(configData.encrypted_access_token, encryptionKey)
          : configData.accessToken;
        if (!accessToken) {
          errorMsg = 'Access token not found';
        } else {
          exists = await verifyOneDriveFile(accessToken, doc.storage_path);
        }
      } else if (storageConfig.provider === 'google_drive') {
        const accessToken = configData.encrypted_access_token
          ? decrypt(configData.encrypted_access_token, encryptionKey)
          : configData.accessToken;
        if (!accessToken) {
          errorMsg = 'Access token not found';
        } else {
          exists = await verifyGoogleDriveFile(accessToken, doc.storage_path);
        }
      } else if (storageConfig.provider === 'supabase') {
        const bucket = configData.bucket || 'documents';
        exists = await verifySupabaseFile(bucket, doc.storage_path);
      }

      if (exists) {
        verified++;
        console.log(`✅ ${doc.original_filename} - Verified`);
        toUpdate.push({ id: doc.id, status: 'verified' });
      } else {
        notFound++;
        console.log(`❌ ${doc.original_filename} - Not found in storage`);
        toUpdate.push({
          id: doc.id,
          status: 'not_found',
          error: errorMsg || 'File not found in storage',
        });
      }
    } catch (err: any) {
      errors++;
      console.log(`⚠️  ${doc.original_filename} - Error: ${err.message}`);
      toUpdate.push({
        id: doc.id,
        status: 'failed',
        error: err.message,
      });
    }
  }

  // Update documents if in fix mode
  if (fixMode && toUpdate.length > 0) {
    console.log('\n🔧 Updating document verification status...');
    for (const update of toUpdate) {
      await supabase
        .from('documents')
        .update({
          upload_verification_status: update.status,
          upload_verified_at: new Date().toISOString(),
          upload_error: update.error || null,
        })
        .eq('id', update.id);
    }
    console.log('✅ Updated verification status for all documents');
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Verified: ${verified}`);
  console.log(`   Not Found: ${notFound}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total: ${documents.length}`);

  if (notFound > 0 || errors > 0) {
    console.log('\n⚠️  Some files need attention. Run with --fix to update status.');
  } else {
    console.log('\n✅ All files verified successfully!');
  }
}

verifyStorageUploads().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

