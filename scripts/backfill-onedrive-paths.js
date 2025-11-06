#!/usr/bin/env node

/**
 * Backfill OneDrive file paths for existing documents
 * 
 * This script updates existing documents that have OneDrive storage_provider
 * but don't have onedrive_path in their metadata. It fetches the path from
 * Microsoft Graph API and updates the document metadata.
 * 
 * Usage:
 *   node scripts/backfill-onedrive-paths.js
 * 
 * Environment variables required:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - ENCRYPTION_KEY (for decrypting tokens)
 */

const { createClient } = require('@supabase/supabase-js');

// Simple XOR decryption (matches @docuflow/shared)
function decrypt(encryptedText, key) {
  if (!encryptedText) return encryptedText;
  try {
    const text = Buffer.from(encryptedText, 'base64').toString('binary');
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    throw new Error('Failed to decrypt data');
  }
}

async function getOneDriveFilePath(accessToken, driveItemId) {
  try {
    const itemUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${driveItemId}?$select=id,name,parentReference,webUrl`;
    const response = await fetch(itemUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const item = await response.json();
    if (!item) return null;

    // Build path from parentReference
    let pathParts = [item.name];

    if (item.parentReference?.path) {
      const parentPath = item.parentReference.path;
      const pathMatch = parentPath.match(/root:(.+)$/);
      if (pathMatch) {
        const parentPathPart = pathMatch[1].replace(/^\//, '');
        pathParts = parentPathPart ? [parentPathPart, item.name] : [item.name];
      }
    } else if (item.parentReference?.id && item.parentReference.id !== 'root') {
      // Recursively get parent path
      const parentPath = await getOneDriveFilePath(accessToken, item.parentReference.id);
      if (parentPath) {
        pathParts = [parentPath.path, item.name];
      }
    }

    const fullPath = pathParts.join('/').replace(/\/+/g, '/');

    return {
      path: fullPath,
      webUrl: item.webUrl,
    };
  } catch (error) {
    console.error(`Error retrieving OneDrive file path for ${driveItemId}:`, error);
    return null;
  }
}

async function backfillOneDrivePaths() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  if (!encryptionKey) {
    console.error('❌ Missing ENCRYPTION_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🔍 Finding OneDrive documents without path metadata...');

  // Find all OneDrive documents that don't have onedrive_path in metadata
  const { data: documents, error: fetchError } = await supabase
    .from('documents')
    .select(`
      id,
      storage_path,
      storage_provider,
      storage_config_id,
      metadata,
      organization_id
    `)
    .eq('storage_provider', 'onedrive')
    .not('storage_config_id', 'is', null);

  if (fetchError) {
    console.error('❌ Error fetching documents:', fetchError);
    process.exit(1);
  }

  if (!documents || documents.length === 0) {
    console.log('✅ No documents need backfilling');
    return;
  }

  // Filter documents that don't have onedrive_path in metadata
  const documentsToBackfill = documents.filter((doc) => {
    const metadata = doc.metadata || {};
    return !metadata.onedrive_path;
  });

  console.log(`📋 Found ${documentsToBackfill.length} documents to backfill`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Process documents in batches
  for (const document of documentsToBackfill) {
    try {
      // Get storage config
      const { data: storageConfig, error: storageError } = await supabase
        .from('storage_configs')
        .select('*')
        .eq('id', document.storage_config_id)
        .eq('organization_id', document.organization_id)
        .single();

      if (storageError || !storageConfig) {
        console.warn(`⚠️  Skipping document ${document.id}: Storage config not found`);
        errorCount++;
        continue;
      }

      // Get and decrypt access token
      const config = storageConfig.config || {};
      let accessToken;

      if (config.encrypted_access_token) {
        accessToken = decrypt(config.encrypted_access_token, encryptionKey);
      } else if (config.accessToken) {
        accessToken = config.accessToken;
      } else {
        console.warn(`⚠️  Skipping document ${document.id}: No access token`);
        errorCount++;
        continue;
      }

      // Get file path from OneDrive
      const fileInfo = await getOneDriveFilePath(accessToken, document.storage_path);

      if (!fileInfo) {
        console.warn(`⚠️  Could not retrieve path for document ${document.id}`);
        errorCount++;
        continue;
      }

      // Update document metadata
      const metadata = document.metadata || {};
      metadata.onedrive_path = fileInfo.path;
      if (fileInfo.webUrl) {
        metadata.onedrive_web_url = fileInfo.webUrl;
      }

      const { error: updateError } = await supabase
        .from('documents')
        .update({ metadata })
        .eq('id', document.id);

      if (updateError) {
        console.error(`❌ Error updating document ${document.id}:`, updateError);
        errorCount++;
        errors.push({ documentId: document.id, error: updateError.message });
      } else {
        successCount++;
        console.log(`✅ Updated document ${document.id}: ${fileInfo.path}`);
      }
    } catch (error) {
      console.error(`❌ Error processing document ${document.id}:`, error);
      errorCount++;
      errors.push({ documentId: document.id, error: error.message });
    }
  }

  console.log('\n📊 Backfill Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📝 Total: ${documentsToBackfill.length}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach(({ documentId, error }) => {
      console.log(`   - Document ${documentId}: ${error}`);
    });
  }

  if (errorCount === 0) {
    console.log('\n🎉 All documents backfilled successfully!');
  }
}

// Run the backfill
backfillOneDrivePaths()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

