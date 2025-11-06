import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createUnauthorizedResponse, createNotFoundResponse, createSuccessResponse, createInternalErrorResponse } from '@/lib/api-helpers';
import { ErrorMessages } from '@/lib/errors';
import { createStorageAdapter } from '@docuflow/storage-adapters';
import { decrypt } from '@docuflow/shared';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Handle async params (Next.js 15) - declare outside try block for error handling
  const resolvedParams = await Promise.resolve(params);
  const documentId = resolvedParams.id;
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return createUnauthorizedResponse(ErrorMessages.UNAUTHORIZED);
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return createInternalErrorResponse(ErrorMessages.NO_ORGANIZATION);
    }

    // Fetch document with related information
    const { data: document, error: fetchError } = await supabase
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
      .eq('id', documentId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (fetchError || !document) {
      return createNotFoundResponse(ErrorMessages.DOCUMENT_NOT_FOUND);
    }

    // Try to get a preview URL if the storage adapter supports it
    let previewUrl: string | null = null;
    if (document.storage_config_id) {
      try {
        const { data: storageConfig } = await supabase
          .from('storage_configs')
          .select('*')
          .eq('id', document.storage_config_id)
          .eq('organization_id', profile.organization_id)
          .single();

        if (storageConfig) {
          // Generate preview URL using storage adapter
          try {
            const config = storageConfig.config as any || {};
            let adapterConfig: any = {
              provider: storageConfig.provider,
              ...config,
            };

            // Decrypt tokens if needed (consistent with download route)
            if (storageConfig.provider === 'onedrive' || storageConfig.provider === 'google_drive') {
              try {
                if (config.encrypted_access_token) {
                  adapterConfig.accessToken = decrypt(config.encrypted_access_token as string);
                } else if (!config.accessToken) {
                  throw new Error('Storage credentials are missing. Please reconnect your storage account.');
                }
                
                if (config.encrypted_refresh_token) {
                  adapterConfig.refreshToken = decrypt(config.encrypted_refresh_token as string);
                }
              } catch (decryptError: any) {
                // If decryption fails or tokens are missing, this is an auth error
                const errorMsg = decryptError?.message || 'Failed to decrypt storage credentials';
                console.error('Token decryption failed in view route:', {
                  documentId,
                  storageProvider: storageConfig.provider,
                  error: errorMsg,
                });
                // Don't set previewUrl for auth errors
                previewUrl = null;
                throw new Error(errorMsg);
              }
            }

            if (storageConfig.provider === 'supabase') {
              adapterConfig.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
              adapterConfig.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
              if (!adapterConfig.bucket) {
                adapterConfig.bucket = 'documents';
              }
            }

            const adapter = createStorageAdapter(adapterConfig);
            previewUrl = await adapter.getPublicUrl(document.storage_path);
            
            // If getPublicUrl returns null, check the provider
            // For cloud storage (OneDrive, Google Drive), don't fall back to download
            // as it will likely fail with the same auth error
            // For Supabase, we can fall back since it uses different auth
            if (!previewUrl) {
              if (storageConfig.provider === 'supabase') {
                console.warn('Supabase storage returned null preview URL, using download endpoint');
                previewUrl = `/api/documents/${documentId}/download?preview=true`;
              } else {
                console.warn('Storage adapter returned null preview URL, not falling back to download (likely auth issue)');
                previewUrl = null;
              }
            }
          } catch (adapterError: any) {
            // If preview URL generation fails, check if it's an authentication error
            const errorMessage = adapterError?.message || adapterError?.toString() || '';
            const isAuthError = errorMessage.includes('401') || 
                               errorMessage.includes('Unauthorized') || 
                               errorMessage.includes('authentication') ||
                               errorMessage.includes('token') ||
                               errorMessage.includes('credentials');
            
            console.error('Failed to generate preview URL:', {
              error: errorMessage,
              documentId,
              storageProvider: storageConfig.provider,
              isAuthError,
              stack: adapterError?.stack,
            });
            
            // For authentication errors, don't fall back to download (it will also fail)
            // Let the frontend handle the error properly
            if (isAuthError) {
              previewUrl = null; // Don't set preview URL for auth errors
            } else {
              // For other errors, fallback to download endpoint
              previewUrl = `/api/documents/${documentId}/download?preview=true`;
            }
          }
        }
      } catch (error: any) {
        // Preview URL generation failed, check error type
        const errorMessage = error?.message || error?.toString() || '';
        const isAuthError = errorMessage.includes('401') || 
                           errorMessage.includes('Unauthorized') || 
                           errorMessage.includes('authentication') ||
                           errorMessage.includes('token') ||
                           errorMessage.includes('credentials');
        
        console.error('Failed to generate preview URL (outer catch):', {
          error: errorMessage,
          documentId,
          isAuthError,
          stack: error?.stack,
        });
        
        // For authentication errors, don't fall back to download
        if (!isAuthError) {
          previewUrl = `/api/documents/${documentId}/download?preview=true`;
        } else {
          previewUrl = null;
        }
      }
    } else {
      // No storage config, use download endpoint as preview
      previewUrl = `/api/documents/${documentId}/download?preview=true`;
    }

    // Format response
    const response = {
      id: document.id,
      original_filename: document.original_filename,
      stored_filename: document.stored_filename || document.original_filename,
      file_type: document.file_type,
      file_size: document.file_size,
      mime_type: document.mime_type,
      sender_email: document.sender_email,
      storage_provider: document.storage_provider,
      storage_path: document.storage_path,
      status: document.status,
      metadata: document.metadata,
      preview_url: previewUrl,
      document_request: document.document_requests,
      routing_rule: document.routing_rules,
      created_at: document.created_at,
      updated_at: document.updated_at,
    };

    const duration = Date.now() - startTime;
    
    // Log performance
    console.log('[API View]', {
      documentId,
      duration: `${duration}ms`,
      hasPreview: !!previewUrl,
      storageProvider: document.storage_provider,
      mimeType: document.mime_type,
    });

    const apiResponse = createSuccessResponse({
      document: response,
      previewUrl: previewUrl || `/api/documents/${documentId}/download?preview=true`,
    });

    // Add performance header
    apiResponse.headers.set('X-Response-Time', `${duration}ms`);
    
    return apiResponse;
  } catch (error: any) {
    console.error('Error fetching document:', {
      error: error?.message || error,
      documentId,
      stack: error?.stack,
    });
    return createInternalErrorResponse(
      error?.message || ErrorMessages.DOCUMENT_NOT_FOUND
    );
  }
}

