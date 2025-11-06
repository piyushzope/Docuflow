import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createStorageAdapter } from '@docuflow/storage-adapters';
import { decrypt } from '@docuflow/shared';
import { createUnauthorizedResponse, createNotFoundResponse, createInternalErrorResponse } from '@/lib/api-helpers';
import { ErrorMessages, getErrorMessage } from '@/lib/errors';

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

    // Fetch document
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (fetchError || !document) {
      console.error('Document not found:', {
        documentId,
        organizationId: profile.organization_id,
        error: fetchError?.message,
      });
      return createNotFoundResponse(ErrorMessages.DOCUMENT_NOT_FOUND);
    }

    // Get storage configuration
    if (!document.storage_config_id) {
      console.error('Document missing storage config:', {
        documentId,
        storageConfigId: document.storage_config_id,
      });
      return createNotFoundResponse(ErrorMessages.STORAGE_NOT_FOUND);
    }

    const { data: storageConfig, error: storageError } = await supabase
      .from('storage_configs')
      .select('*')
      .eq('id', document.storage_config_id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (storageError || !storageConfig) {
      console.error('Storage config not found:', {
        documentId,
        storageConfigId: document.storage_config_id,
        organizationId: profile.organization_id,
        error: storageError?.message,
      });
      return createNotFoundResponse(ErrorMessages.STORAGE_NOT_FOUND);
    }

    // Build adapter config based on provider
    const storage = storageConfig as any;
    const config = storage.config || {};
    let adapterConfig: any = { provider: storage.provider, ...config };

    try {
      // Decrypt tokens if needed
      if (storage.provider === 'onedrive' || storage.provider === 'google_drive') {
        if (config.encrypted_access_token) {
          try {
            adapterConfig.accessToken = decrypt(config.encrypted_access_token as string);
          } catch (decryptError: any) {
            console.error('Failed to decrypt access token:', {
              documentId,
              storageProvider: storage.provider,
              error: decryptError?.message || decryptError,
            });
            return createInternalErrorResponse('Failed to decrypt storage credentials. Please reconnect your storage account.');
          }
        } else if (!config.accessToken) {
          console.error('Missing access token for storage:', {
            documentId,
            storageProvider: storage.provider,
            storageConfigId: storageConfig.id,
          });
          return createInternalErrorResponse('Storage credentials are missing. Please reconnect your storage account.');
        }

        if (config.encrypted_refresh_token) {
          try {
            adapterConfig.refreshToken = decrypt(config.encrypted_refresh_token as string);
          } catch (decryptError: any) {
            console.warn('Failed to decrypt refresh token (non-critical):', {
              documentId,
              storageProvider: storage.provider,
              error: decryptError?.message || decryptError,
            });
            // Refresh token is optional, continue without it
          }
        }
      }

      if (storage.provider === 'supabase') {
        adapterConfig.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        adapterConfig.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!adapterConfig.bucket) {
          adapterConfig.bucket = 'documents';
        }
        
        if (!adapterConfig.supabaseUrl || !adapterConfig.supabaseKey) {
          console.error('Missing Supabase configuration:', {
            documentId,
            hasUrl: !!adapterConfig.supabaseUrl,
            hasKey: !!adapterConfig.supabaseKey,
          });
          return createInternalErrorResponse('Storage configuration is incomplete.');
        }
      }

      // Create storage adapter and download file
      const adapter = createStorageAdapter(adapterConfig);
      
      if (!document.storage_path) {
        console.error('Document missing storage path:', {
          documentId,
          storagePath: document.storage_path,
        });
        return createInternalErrorResponse('Document storage path is missing.');
      }

      const fileData = await adapter.downloadFile(document.storage_path);
      
      // Handle both Buffer and ReadableStream responses
      let fileBuffer: Buffer;
      
      // Check if it's already a Buffer
      if (Buffer.isBuffer(fileData)) {
        fileBuffer = fileData;
      }
      // Check if it's a ReadableStream (check for getReader method which is more reliable)
      else if (fileData && typeof fileData === 'object' && 'getReader' in fileData && typeof (fileData as any).getReader === 'function') {
        // Convert ReadableStream to Buffer
        const stream = fileData as ReadableStream<Uint8Array>;
        const chunks: Uint8Array[] = [];
        const reader = stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }
        // Combine all chunks into a single buffer
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        fileBuffer = Buffer.from(combined);
      }
      // Check if it's an ArrayBuffer
      else if (fileData instanceof ArrayBuffer) {
        fileBuffer = Buffer.from(fileData);
      }
      // Check if it has arrayBuffer method (Blob-like objects)
      else if (fileData && typeof fileData === 'object' && 'arrayBuffer' in fileData && typeof (fileData as any).arrayBuffer === 'function') {
        try {
          const arrayBuffer = await (fileData as any).arrayBuffer();
          fileBuffer = Buffer.from(arrayBuffer);
        } catch (arrayBufferError) {
          console.error('Failed to convert to ArrayBuffer:', {
            documentId,
            storagePath: document.storage_path,
            storageProvider: storage.provider,
            error: arrayBufferError,
          });
          return createInternalErrorResponse('File data format is not supported.');
        }
      }
      // Check if it's a Uint8Array
      else if (fileData instanceof Uint8Array) {
        fileBuffer = Buffer.from(fileData);
      }
      // Try to convert to buffer (fallback)
      else {
        try {
          // Check the actual type to provide better error messages
          const dataType = fileData?.constructor?.name || typeof fileData;
          console.log('Attempting to convert file data:', {
            documentId,
            storagePath: document.storage_path,
            storageProvider: storage.provider,
            dataType,
            hasToString: typeof fileData?.toString === 'function',
            keys: fileData && typeof fileData === 'object' ? Object.keys(fileData) : [],
          });
          
          fileBuffer = Buffer.from(fileData as any);
        } catch (conversionError: any) {
          console.error('Failed to convert file data to Buffer:', {
            documentId,
            storagePath: document.storage_path,
            storageProvider: storage.provider,
            dataType: fileData?.constructor?.name || typeof fileData,
            errorMessage: conversionError?.message || String(conversionError),
            error: conversionError,
          });
          return createInternalErrorResponse(
            `File data format is not supported. Received: ${fileData?.constructor?.name || typeof fileData}. Please check storage adapter implementation.`
          );
        }
      }
      
      if (!fileBuffer || fileBuffer.length === 0) {
        console.error('Downloaded file buffer is empty:', {
          documentId,
          storagePath: document.storage_path,
          storageProvider: storage.provider,
        });
        return createInternalErrorResponse('File could not be downloaded from storage.');
      }

      // Determine filename
      const filename = document.stored_filename || document.original_filename;

      // Log activity (non-blocking)
      (async () => {
        try {
          const { error: logError } = await supabase
            .from('activity_logs')
            .insert({
              organization_id: profile.organization_id,
              user_id: user.id,
              action: 'download',
              resource_type: 'document',
              resource_id: documentId,
              details: {
                filename: filename,
                storage_path: document.storage_path,
              },
            });
          if (logError) {
            console.warn('Failed to log download activity:', logError);
          }
        } catch (logError) {
          // Log activity failure but don't fail the request
          console.warn('Failed to log download activity:', logError);
        }
      })();

      // Check if this is a preview request (via query param) or download
      const searchParams = request.nextUrl.searchParams;
      const isPreview = searchParams.get('preview') === 'true';
      
      // Determine MIME type with fallback detection
      let mimeType = document.mime_type || 'application/octet-stream';
      
      // If MIME type is missing, try to infer from filename
      if (!document.mime_type || mimeType === 'application/octet-stream') {
        const extension = filename.toLowerCase().split('.').pop();
        const mimeTypeMap: Record<string, string> = {
          // Images
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'jfif': 'image/jpeg',
          'pjpeg': 'image/jpeg',
          'pjp': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
          'bmp': 'image/bmp',
          'svg': 'image/svg+xml',
          'ico': 'image/x-icon',
          'tiff': 'image/tiff',
          'tif': 'image/tiff',
          'heic': 'image/heic',
          'heif': 'image/heif',
          // PDF
          'pdf': 'application/pdf',
          // Text
          'txt': 'text/plain',
          'md': 'text/markdown',
          'csv': 'text/csv',
          'json': 'application/json',
          'xml': 'text/xml',
          'html': 'text/html',
          'css': 'text/css',
          'js': 'text/javascript',
          'ts': 'text/typescript',
          'log': 'text/plain',
          // Office
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'ppt': 'application/vnd.ms-powerpoint',
          'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          // Video
          'mp4': 'video/mp4',
          'webm': 'video/webm',
          'avi': 'video/x-msvideo',
          'mov': 'video/quicktime',
          'wmv': 'video/x-ms-wmv',
          'flv': 'video/x-flv',
          'mkv': 'video/x-matroska',
          // Audio
          'mp3': 'audio/mpeg',
          'wav': 'audio/wav',
          'ogg': 'audio/ogg',
          'aac': 'audio/aac',
          'flac': 'audio/flac',
          'm4a': 'audio/mp4',
        };
        if (extension && mimeTypeMap[extension]) {
          mimeType = mimeTypeMap[extension];
        }
      }
      
      // For preview mode, sanitize risky content types to prevent XSS
      if (isPreview) {
        // HTML and SVG can contain scripts - render as plain text in preview
        if (mimeType === 'text/html' || mimeType === 'image/svg+xml') {
          mimeType = 'text/plain';
        }
      }
      
      // In preview mode, enhance MIME type detection with magic number sniffing
      if (isPreview) {
        const ext = filename.toLowerCase().split('.').pop() || '';
        const buf = new Uint8Array(fileBuffer);
        
        // Define known safe MIME types that should be preserved
        const knownSafeTypes = [
          'application/pdf',
          'application/json',
          'text/plain',
          'text/markdown',
          'text/csv',
          'text/xml',
          'text/css',
          'text/javascript',
          'text/typescript',
        ];
        
        // Check if we already have a known safe type (preserve it)
        const hasKnownSafeType = knownSafeTypes.includes(mimeType) ||
          mimeType.startsWith('video/') ||
          mimeType.startsWith('audio/') ||
          mimeType.startsWith('text/') ||
          mimeType.startsWith('application/vnd.ms-') ||
          mimeType.startsWith('application/vnd.openxmlformats-');
        
        // Normalize JPEG variants based on extension
        if (['jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp'].includes(ext)) {
          mimeType = 'image/jpeg';
        }
        
        // If we have a known safe type, preserve it and skip magic number sniffing
        if (hasKnownSafeType) {
          // Known safe type, preserve it
        } else if (mimeType === 'application/octet-stream') {
          // When MIME type is still unknown, check magic numbers for common types
          // Check for PDF magic number (%PDF) first - most common case
          if (buf.length >= 4) {
            const pdfHeader = fileBuffer.toString('ascii', 0, 4);
            if (pdfHeader === '%PDF') {
              mimeType = 'application/pdf';
            }
          }
          // If not PDF, check for image formats (only if extension suggests it might be an image)
          if (mimeType === 'application/octet-stream' && ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
          // Only do image magic number sniffing if extension suggests it might be an image
          // This helps correct misidentified image files
          const looksLikeJpeg = buf.length > 2 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
          const looksLikePng = buf.length > 3 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
          const looksLikeGif = buf.length > 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38;
          const looksLikeWebp = buf.length > 11 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;
          
            if (looksLikeJpeg) mimeType = 'image/jpeg';
            else if (looksLikePng) mimeType = 'image/png';
            else if (looksLikeGif) mimeType = 'image/gif';
            else if (looksLikeWebp) mimeType = 'image/webp';
          }
        }
        
        // Only set to application/octet-stream for truly unknown types that are potentially unsafe
        // Do NOT overwrite known safe types (PDF, video, audio, text, office docs)
        if (!hasKnownSafeType && 
            !mimeType.startsWith('image/') && 
            mimeType === 'application/octet-stream' && 
            ext && !['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
          // Keep as application/octet-stream for truly unknown types
          // This is safer than trying to guess
        }
      }
      
      // Check for Range request (for video/audio streaming)
      const rangeHeader = request.headers.get('range');
      const supportsRange = isPreview && (mimeType.startsWith('video/') || mimeType.startsWith('audio/'));
      
      // Handle Range requests for video/audio streaming
      if (rangeHeader && supportsRange) {
        const fileSize = fileBuffer.length;
        const range = rangeHeader.match(/bytes=(\d+)-(\d*)/);
        
        if (range) {
          const start = parseInt(range[1], 10);
          const end = range[2] ? parseInt(range[2], 10) : fileSize - 1;
          const chunkSize = end - start + 1;
          
          const chunk = fileBuffer.slice(start, end + 1);
          
          const headers = new Headers({
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Content-Type': mimeType,
            'Vary': 'Cookie',
            'X-Content-Type-Options': 'nosniff',
          });
          
          if (isPreview) {
            // IMPORTANT: Do NOT include filename in Content-Disposition for preview mode
            // Some browsers treat inline with filename as a download trigger
            headers.set('Content-Disposition', 'inline');
            headers.set('Cache-Control', 'public, max-age=3600');
            // Add CORS headers for embed/iframe embedding
            headers.set('Access-Control-Allow-Origin', '*');
            // Explicitly set Content-Type to prevent browser from guessing
            // This is critical for PDFs to display inline instead of downloading
            // For PDFs, always ensure Content-Type is application/pdf
            const fileExt = filename.toLowerCase().split('.').pop() || '';
            const isPdf = mimeType === 'application/pdf' || fileExt === 'pdf';
            if (isPdf) {
              headers.set('Content-Type', 'application/pdf');
            } else if (mimeType) {
              headers.set('Content-Type', mimeType);
            }
          } else {
            headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
          }
          
          return new NextResponse(chunk, {
            status: 206, // Partial Content
            headers,
          });
        }
      }
      
      // Return file (full file or non-range request)
      const headers = new Headers({
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.length.toString(),
        'Vary': 'Cookie',
        'X-Content-Type-Options': 'nosniff',
      });
      
      // Add Range support headers for video/audio even if no range request
      if (supportsRange) {
        headers.set('Accept-Ranges', 'bytes');
      }
      
      // Add CORS headers for previews to allow cross-origin loading
      if (isPreview) {
        // For PDFs and other previewable files, use inline to display in browser
        // IMPORTANT: Do NOT include filename in Content-Disposition for preview mode
        // Some browsers treat inline with filename as a download trigger
        headers.set('Content-Disposition', 'inline');
        headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        // Add CORS headers for embed/iframe embedding
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('X-Content-Type-Options', 'nosniff');
        // Explicitly set Content-Type to prevent browser from guessing
        // This is critical for PDFs to display inline instead of downloading
        // For PDFs, always ensure Content-Type is application/pdf
        const fileExt = filename.toLowerCase().split('.').pop() || '';
        const isPdf = mimeType === 'application/pdf' || fileExt === 'pdf';
        if (isPdf) {
          headers.set('Content-Type', 'application/pdf');
        } else if (mimeType) {
          headers.set('Content-Type', mimeType);
        }
        // Prevent browsers from auto-downloading based on file extension
        headers.set('X-Download-Options', 'noopen');
      } else {
        // Force download for explicit download requests (when user clicks Download button)
        headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      }

      const duration = Date.now() - startTime;
      
      // Log performance
      console.log('[API Download]', {
        documentId,
        duration: `${duration}ms`,
        fileSize: fileBuffer.length,
        isPreview,
        storageProvider: storage.provider,
        mimeType,
      });

      headers.set('X-Response-Time', `${duration}ms`);

      return new NextResponse(fileBuffer, {
        status: 200,
        headers,
      });
    } catch (adapterError: any) {
      // Handle storage adapter specific errors
      const errorMessage = adapterError?.message || adapterError?.toString() || 'Unknown storage error';
      console.error('Storage adapter error:', {
        documentId,
        storageProvider: storage?.provider || 'unknown',
        storagePath: document?.storage_path || 'unknown',
        error: errorMessage,
        stack: adapterError?.stack,
      });

      // Provide more specific error messages based on error type
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('token')) {
        return createInternalErrorResponse('Storage authentication failed. Please reconnect your storage account.');
      }
      if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        return createNotFoundResponse('File not found in storage. It may have been deleted.');
      }
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        return createInternalErrorResponse('Access denied to storage file. Please check storage permissions.');
      }

      return createInternalErrorResponse(`Failed to download file: ${errorMessage}`);
    }
  } catch (error: any) {
    console.error('Error downloading document:', {
      documentId,
      error: error?.message || error?.toString() || 'Unknown error',
      stack: error?.stack,
    });
    return createInternalErrorResponse(
      getErrorMessage(error, ErrorMessages.DOCUMENT_DOWNLOAD_FAILED)
    );
  }
}

