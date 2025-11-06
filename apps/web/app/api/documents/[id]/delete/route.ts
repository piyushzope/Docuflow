import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createStorageAdapter } from '@docuflow/storage-adapters';
import { decrypt } from '@docuflow/shared';
import { createUnauthorizedResponse, createNotFoundResponse, createSuccessResponse, createInternalErrorResponse } from '@/lib/api-helpers';
import { ErrorMessages, getErrorMessage } from '@/lib/errors';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return createUnauthorizedResponse(ErrorMessages.UNAUTHORIZED);
    }

    // Handle async params (Next.js 15)
    const resolvedParams = await Promise.resolve(params);
    const documentId = resolvedParams.id;

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return createInternalErrorResponse(ErrorMessages.NO_ORGANIZATION);
    }

    // Fetch document with storage config
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (fetchError || !document) {
      console.error('Document not found or fetch error:', {
        documentId,
        organizationId: profile.organization_id,
        fetchError,
        hasDocument: !!document
      });
      return createNotFoundResponse(ErrorMessages.DOCUMENT_NOT_FOUND);
    }

    // Delete file from storage if storage config exists
    if (document.storage_config_id && document.storage_path) {
      try {
        const { data: storageConfig } = await supabase
          .from('storage_configs')
          .select('*')
          .eq('id', document.storage_config_id)
          .eq('organization_id', profile.organization_id)
          .single();

        if (storageConfig) {
          const config = storageConfig.config as any || {};
          let adapterConfig: any = {
            provider: storageConfig.provider,
            ...config,
          };

          // Decrypt tokens if needed
          if (storageConfig.provider === 'onedrive' || storageConfig.provider === 'google_drive') {
            if (config.encrypted_access_token) {
              adapterConfig.accessToken = decrypt(config.encrypted_access_token as string);
            }
            if (config.encrypted_refresh_token) {
              adapterConfig.refreshToken = decrypt(config.encrypted_refresh_token as string);
            }
          }

          if (storageConfig.provider === 'supabase') {
            adapterConfig.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            adapterConfig.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (!adapterConfig.bucket) {
              adapterConfig.bucket = 'documents';
            }
          }

          // Create storage adapter and delete file
          const adapter = createStorageAdapter(adapterConfig);
          await adapter.deleteFile(document.storage_path);
        }
      } catch (storageError: any) {
        // Log storage deletion error but continue with database deletion
        console.error('Error deleting file from storage:', storageError);
        // Don't fail the entire operation if storage deletion fails
        // The file might have already been deleted or the storage might be unavailable
      }
    }

    // Delete document record from database
    const { data: deletedData, error: deleteError, count } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('organization_id', profile.organization_id)
      .select();

    if (deleteError) {
      console.error('Error deleting document:', deleteError);
      const errorMessage = deleteError.code === '42501' || deleteError.message?.includes('policy')
        ? 'Permission denied. Please ensure the DELETE policy is enabled for documents. Run migration: 20250108000000_add_documents_delete_policy.sql'
        : deleteError.message || 'Failed to delete document';
      return createInternalErrorResponse(errorMessage);
    }

    // Check if any rows were actually deleted
    if (!deletedData || deletedData.length === 0) {
      console.error('No document was deleted - document may not exist or RLS policy prevented deletion:', {
        documentId,
        organizationId: profile.organization_id,
        userId: user.id
      });
      return createNotFoundResponse('Document not found or could not be deleted. Please ensure the DELETE policy is enabled for documents.');
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      action: 'delete',
      resource_type: 'document',
      resource_id: documentId,
      details: {
        filename: document.original_filename,
        storage_path: document.storage_path,
        storage_provider: document.storage_provider,
      },
    });

    return createSuccessResponse(
      { id: documentId },
      'Document deleted successfully'
    );
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return createInternalErrorResponse(getErrorMessage(error, 'Failed to delete document'));
  }
}

