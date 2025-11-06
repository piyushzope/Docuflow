import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyFileUpload } from '@/lib/storage/verify-upload';
import { decrypt } from '@docuflow/shared';

/**
 * Verify that a document file exists in storage
 * GET /api/documents/[id]/verify
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = await Promise.resolve(params);

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Please log in to continue' },
        { status: 401 }
      );
    }

    // Get document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*, storage_configs:storage_config_id (*)')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found', details: docError?.message },
        { status: 404 }
      );
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id || document.organization_id !== profile.organization_id) {
      return NextResponse.json(
        { error: 'Forbidden', details: 'You do not have access to this document' },
        { status: 403 }
      );
    }

    // Get storage config
    const storageConfig = (document as any).storage_configs;
    if (!storageConfig) {
      return NextResponse.json(
        { error: 'Storage configuration not found', details: 'Document storage config is missing' },
        { status: 404 }
      );
    }

    // Get encryption key
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Encryption key not configured' },
        { status: 500 }
      );
    }

    // Prepare verification options
    const configData = storageConfig.config as any || {};
    let accessToken: string | undefined;
    
    if (storageConfig.provider === 'onedrive' || storageConfig.provider === 'google_drive') {
      accessToken = configData.encrypted_access_token
        ? decrypt(configData.encrypted_access_token, encryptionKey)
        : configData.accessToken;
      
      if (!accessToken) {
        return NextResponse.json(
          { error: 'Storage token not found', details: 'Access token is missing or invalid' },
          { status: 400 }
        );
      }
    }

    // Verify file exists
    const verificationResult = await verifyFileUpload(
      storageConfig.provider as 'onedrive' | 'google_drive' | 'supabase',
      document.storage_path,
      {
        accessToken,
        supabase: supabase,
        bucket: configData.bucket || 'documents',
      }
    );

    // Update document with verification status
    const updateData: any = {
      upload_verified_at: new Date().toISOString(),
      upload_verification_status: verificationResult.status,
    };

    if (!verificationResult.verified && verificationResult.error) {
      updateData.upload_error = verificationResult.error;
    } else if (verificationResult.verified) {
      updateData.upload_error = null;
    }

    await supabase
      .from('documents')
      .update(updateData)
      .eq('id', id);

    // Log verification activity
    await supabase.from('activity_logs').insert({
      organization_id: document.organization_id,
      action: 'verify_upload',
      resource_type: 'document',
      details: {
        document_id: id,
        filename: document.original_filename,
        verification_status: verificationResult.status,
        verified: verificationResult.verified,
        error: verificationResult.error,
      },
    });

    return NextResponse.json({
      success: true,
      verified: verificationResult.verified,
      status: verificationResult.status,
      error: verificationResult.error,
      fileDetails: verificationResult.fileDetails,
      verifiedAt: updateData.upload_verified_at,
    });
  } catch (error: any) {
    console.error('Error verifying document upload:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

