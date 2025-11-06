import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@docuflow/shared';
import { createUnauthorizedResponse, createNotFoundResponse, createInternalErrorResponse } from '@/lib/api-helpers';
import { ErrorMessages } from '@/lib/errors';

/**
 * Get OneDrive file path and web URL from drive item ID
 * This endpoint retrieves the human-readable path and web URL for a OneDrive file
 */
export async function GET(
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

    // Fetch document
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (fetchError || !document) {
      return createNotFoundResponse(ErrorMessages.DOCUMENT_NOT_FOUND);
    }

    // Only process OneDrive documents
    if (document.storage_provider !== 'onedrive') {
      return NextResponse.json(
        { error: 'Document is not stored in OneDrive' },
        { status: 400 }
      );
    }

    // Check if path is already in metadata
    const metadata = document.metadata as any;
    if (metadata?.onedrive_path) {
      return NextResponse.json({
        path: metadata.onedrive_path,
        webUrl: metadata.onedrive_web_url || null,
      });
    }

    // Get storage configuration
    if (!document.storage_config_id) {
      return createNotFoundResponse(ErrorMessages.STORAGE_NOT_FOUND);
    }

    const { data: storageConfig, error: storageError } = await supabase
      .from('storage_configs')
      .select('*')
      .eq('id', document.storage_config_id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (storageError || !storageConfig) {
      return createNotFoundResponse(ErrorMessages.STORAGE_NOT_FOUND);
    }

    // Get and decrypt OneDrive access token
    const config = (storageConfig as any).config || {};
    let accessToken: string;

    if (config.encrypted_access_token) {
      accessToken = decrypt(config.encrypted_access_token as string);
    } else if (config.accessToken) {
      accessToken = config.accessToken;
    } else {
      return createInternalErrorResponse('OneDrive access token not found');
    }

    if (!accessToken) {
      return createInternalErrorResponse('OneDrive access token is invalid');
    }

    // Get file info from Microsoft Graph API
    const driveItemId = document.storage_path;
    const itemUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${driveItemId}?$select=id,name,parentReference,webUrl`;

    const response = await fetch(itemUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'OneDrive authentication failed. Please reconnect your OneDrive account.' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: `Failed to retrieve OneDrive file info: ${response.statusText}` },
        { status: response.status }
      );
    }

    const item = await response.json();
    if (!item) {
      return createNotFoundResponse('OneDrive file not found');
    }

    // Build path from parentReference
    let pathParts: string[] = [item.name];
    
    if (item.parentReference?.path) {
      // parentReference.path is like "/drive/root:/Documents/Subfolder"
      // Extract the path part after "root:"
      const parentPath = item.parentReference.path;
      const pathMatch = parentPath.match(/root:(.+)$/);
      if (pathMatch) {
        const parentPathPart = pathMatch[1].replace(/^\//, '');
        pathParts = parentPathPart ? [parentPathPart, item.name] : [item.name];
      }
    }

    const fullPath = pathParts.join('/').replace(/\/+/g, '/');

    return NextResponse.json({
      path: fullPath,
      webUrl: item.webUrl || null,
    });
  } catch (error) {
    console.error('Error retrieving OneDrive file info:', error);
    return createInternalErrorResponse(
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

