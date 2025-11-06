import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createUnauthorizedResponse, createNotFoundResponse, createSuccessResponse, createInternalErrorResponse } from '@/lib/api-helpers';
import { ErrorMessages } from '@/lib/errors';

/**
 * Diagnostics endpoint for document viewer troubleshooting
 * 
 * GET: Retrieve diagnostics information for a document
 * POST: Log viewer error/performance data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const documentId = resolvedParams.id;

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
        storage_configs:storage_config_id (
          id,
          provider,
          is_active
        )
      `)
      .eq('id', documentId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (fetchError || !document) {
      return createNotFoundResponse(ErrorMessages.DOCUMENT_NOT_FOUND);
    }

    // Gather diagnostic information
    const diagnostics = {
      document: {
        id: document.id,
        filename: document.original_filename,
        mimeType: document.mime_type,
        fileSize: document.file_size,
        storageProvider: document.storage_provider,
        storagePath: document.storage_path,
        status: document.status,
        createdAt: document.created_at,
      },
      storage: document.storage_configs ? {
        provider: document.storage_configs.provider,
        isActive: document.storage_configs.is_active,
      } : null,
      recommendations: [] as string[],
    };

    // Generate recommendations based on document state
    if (!document.storage_config_id) {
      diagnostics.recommendations.push('Document has no storage configuration. Please verify storage setup.');
    }

    if (document.storage_configs && !document.storage_configs.is_active) {
      diagnostics.recommendations.push('Storage configuration is inactive. Please reactivate or reconfigure storage.');
    }

    if (!document.mime_type) {
      diagnostics.recommendations.push('Document MIME type is missing. This may affect preview generation.');
    }

    if (document.file_size && document.file_size > 10 * 1024 * 1024) {
      diagnostics.recommendations.push('Large file detected (>10MB). Preview may be slow or unavailable. Consider downloading instead.');
    }

    // Check if storage provider supports preview
    const previewSupported = ['supabase', 'google_drive', 'onedrive'].includes(
      document.storage_provider || ''
    );
    if (!previewSupported) {
      diagnostics.recommendations.push('Storage provider may not support direct preview. Download endpoint will be used.');
    }

    return createSuccessResponse(diagnostics);
  } catch (error: any) {
    console.error('Error fetching diagnostics:', {
      error: error?.message || error,
      documentId,
      stack: error?.stack,
    });
    return createInternalErrorResponse(
      error?.message || 'Failed to fetch diagnostics'
    );
  }
}

/**
 * POST: Log viewer error or performance metrics
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const documentId = resolvedParams.id;

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

    // Verify document belongs to user's organization
    const { data: document } = await supabase
      .from('documents')
      .select('id, organization_id')
      .eq('id', documentId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!document) {
      return createNotFoundResponse(ErrorMessages.DOCUMENT_NOT_FOUND);
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));

    // Log to console (in production, could send to logging service)
    console.log('[Viewer Diagnostics]', {
      documentId,
      userId: user.id,
      organizationId: profile.organization_id,
      data: body,
      timestamp: new Date().toISOString(),
    });

    // In the future, could store in a viewer_logs table
    // For now, just acknowledge receipt
    return createSuccessResponse({
      logged: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error logging diagnostics:', {
      error: error?.message || error,
      documentId,
      stack: error?.stack,
    });
    return createInternalErrorResponse(
      error?.message || 'Failed to log diagnostics'
    );
  }
}

