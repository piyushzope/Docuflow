'use client';

import { useState, useEffect, useMemo } from 'react';
import { SkeletonLoader } from './skeleton-loader';
import { LoadingButton } from './loading-button';
import { 
  logViewerError, 
  logViewerPerformance, 
  determineErrorType, 
  getUserFriendlyErrorMessage,
  type ViewerErrorType 
} from '@/lib/viewer-logging';
import { 
  getCachedPreviewUrl, 
  setCachedPreviewUrl, 
  clearCachedPreviewUrl,
  getRetryDelay 
} from '@/lib/viewer-cache';

interface DocumentViewerProps {
  documentId: string;
  filename: string;
  mimeType?: string;
  storageProvider?: string;
  storagePath?: string;
}

export function DocumentViewer({
  documentId,
  filename,
  mimeType,
  storageProvider,
  storagePath,
}: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [errorType, setErrorType] = useState<ViewerErrorType | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const loadDocument = async () => {
    const startTime = performance.now();
    try {
      setLoading(true);
      setError(null);
      setErrorType(null);
      setLoadProgress(0);

      // Check cache first
      const cachedUrl = getCachedPreviewUrl(documentId);
      if (cachedUrl) {
        // For PDFs, ensure cached URL includes preview=true parameter
        const detectedMimeType = mimeType || '';
        const detectedFilename = filename || '';
        const fileExt = detectedFilename.toLowerCase().split('.').pop() || '';
        const isPdfFile = detectedMimeType === 'application/pdf' || fileExt === 'pdf';
        
        let urlToUse = cachedUrl;
        if (isPdfFile && !cachedUrl.includes('preview=true')) {
          // Ensure PDF URLs always have preview=true to prevent auto-download
          const baseUrl = cachedUrl.split('?')[0];
          urlToUse = `${baseUrl}?preview=true`;
        }
        
        setViewUrl(urlToUse);
        setDownloadUrl(`/api/documents/${documentId}/download`);
        setLoading(false);
        setLoadProgress(100);
        logViewerPerformance(documentId, 'load', performance.now() - startTime, {
          mimeType,
          storageProvider,
          cached: true,
        });
        return;
      }

      setLoadProgress(25);

      // Get document metadata with progress tracking
      const response = await fetch(`/api/documents/${documentId}/view`);
      const loadTime = performance.now() - startTime;
      setLoadProgress(50);
      
      const responseData = await response.json().catch(() => ({}));
      
      // Log performance for successful response
      if (response.ok && responseData.success !== false) {
        logViewerPerformance(documentId, 'load', loadTime, {
          mimeType,
          storageProvider,
          cached: response.headers.get('X-Cache') === 'HIT',
        });
      }
      
      // Check if response indicates an error (either HTTP error or success: false)
      if (!response.ok || responseData.success === false) {
        const errorMessage = responseData.error || responseData.message || `Failed to load document (${response.status || 'unknown'})`;
        const err = new Error(errorMessage);
        const detectedErrorType = determineErrorType(err, response.status);
        const loggedError = logViewerError(documentId, err, detectedErrorType, {
          mimeType,
          storageProvider,
          httpStatus: response.status,
          retryCount,
          filename,
        });
        setErrorType(detectedErrorType);
        setError(getUserFriendlyErrorMessage(detectedErrorType, err, {
          mimeType,
          storageProvider,
          filename,
        }));
        throw err;
      }

      // API returns { success: true, data: { document: {...}, previewUrl: ... } }
      const data = responseData.data || responseData;
      
      // Store file size if available
      if (data.document?.file_size) {
        setFileSize(data.document.file_size);
      }
      
      // Check if there's an error in the data itself
      if (data.error || (data.success === false)) {
        const errorMessage = data.error || data.message || 'Failed to load document preview';
        const err = new Error(errorMessage);
        const detectedErrorType = determineErrorType(err);
        const loggedError = logViewerError(documentId, err, detectedErrorType, {
          mimeType,
          storageProvider,
          filename,
          retryCount,
        });
        setErrorType(detectedErrorType);
        setError(getUserFriendlyErrorMessage(detectedErrorType, err, {
          mimeType,
          storageProvider,
          filename,
        }));
        throw err;
      }
      
      // Set download URL (always available if document exists) - NO preview parameter for explicit downloads
      setDownloadUrl(`/api/documents/${documentId}/download`);
      
      // Determine preview URL from response data
      // For PDFs and other files that need inline display, always use our download endpoint with preview=true
      // This ensures proper Content-Disposition: inline headers
      
      // Check if this is a PDF (need to check before fileTypeInfo is available)
      const detectedMimeType = data.document?.mime_type || mimeType || '';
      const detectedFilename = data.document?.original_filename || filename || '';
      const fileExt = detectedFilename.toLowerCase().split('.').pop() || '';
      const isPdfFile = detectedMimeType === 'application/pdf' || fileExt === 'pdf';
      
      let previewUrlToUse: string | null = null;
      
      // For PDFs, always use our internal endpoint to ensure inline display (not download)
      if (isPdfFile) {
        previewUrlToUse = `/api/documents/${documentId}/download?preview=true`;
      } else if (data.previewUrl) {
        // For other file types, check if it's a safe preview URL
        previewUrlToUse = data.previewUrl;
      } else if (data.document?.preview_url) {
        previewUrlToUse = data.document.preview_url;
      } else if (data.document) {
        // Fallback: Use download endpoint with preview parameter for inline display
        previewUrlToUse = `/api/documents/${documentId}/download?preview=true`;
      } else {
        // Last resort: use download endpoint as preview
        previewUrlToUse = `/api/documents/${documentId}/download?preview=true`;
      }
      
      // If preview URL is cross-origin, use internal download endpoint for safety
      // Also ensure PDFs always use our endpoint
      if (previewUrlToUse && !previewUrlToUse.includes('/error')) {
        try {
          const url = new URL(previewUrlToUse, window.location.origin);
          // If it's cross-origin OR it's a PDF, fallback to internal endpoint with preview=true
          if (url.origin !== window.location.origin || isPdfFile) {
            previewUrlToUse = `/api/documents/${documentId}/download?preview=true`;
          }
        } catch {
          // If URL parsing fails, assume it's a relative URL and use as-is
          // If it starts with http:// or https://, it's absolute but might be same-origin
          if (previewUrlToUse.startsWith('http://') || previewUrlToUse.startsWith('https://')) {
            // For absolute URLs, check if same origin
            try {
              const url = new URL(previewUrlToUse);
              // For PDFs or cross-origin, use our endpoint
              if (url.origin !== window.location.origin || isPdfFile) {
                previewUrlToUse = `/api/documents/${documentId}/download?preview=true`;
              }
            } catch {
              // If parsing fails, use internal endpoint
              previewUrlToUse = `/api/documents/${documentId}/download?preview=true`;
            }
          } else if (isPdfFile) {
            // For PDFs, ensure we use our endpoint even if URL parsing fails
            previewUrlToUse = `/api/documents/${documentId}/download?preview=true`;
          }
        }
        setViewUrl(previewUrlToUse);
        // Cache the preview URL
        if (previewUrlToUse) {
          setCachedPreviewUrl(documentId, previewUrlToUse);
        }
      } else {
        setViewUrl(null);
      }
      
      setLoadProgress(100);
      setRetryCount(0); // Reset retry count on success
    } catch (err: any) {
      const detectedErrorType = errorType || determineErrorType(err);
      if (!errorType) {
        setErrorType(detectedErrorType);
      }
      
      // Clear cache on error to force fresh fetch on retry
      clearCachedPreviewUrl(documentId);
      
      const userFriendlyMessage = getUserFriendlyErrorMessage(detectedErrorType, err, {
        mimeType,
        storageProvider,
        filename,
        fileSize,
        retryCount,
      });
      setError(userFriendlyMessage);
      setLoadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  // Retry with exponential backoff
  const handleRetry = async () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    const delay = getRetryDelay(retryCount);
    
    // Show countdown
    let remaining = delay;
    const interval = setInterval(() => {
      remaining -= 100;
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 100);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    setIsRetrying(false);
    setRetryCount(prev => prev + 1);
    clearInterval(interval);
  };

  // Enhanced file type detection with fallback to filename extension
  const getFileExtension = (filename: string): string => {
    const parts = filename.toLowerCase().split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  };

  // File type detection - computed with useMemo to avoid recalculation
  const fileTypeInfo = useMemo(() => {
    const fileExtension = getFileExtension(filename);
    
    // Image formats - check both MIME type and extension
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'tiff', 'tif'];
    const isImage = mimeType?.startsWith('image/') || imageExtensions.includes(fileExtension);

    // Unsupported image formats for inline <img> preview
    const unsupportedImageMimes = ['image/heic', 'image/heif', 'image/svg+xml'];
    const unsupportedImageExts = ['heic', 'heif', 'svg'];
    const isUnsupportedImage = (!!mimeType && unsupportedImageMimes.includes(mimeType)) || unsupportedImageExts.includes(fileExtension);
    const isDisplayableImage = isImage && !isUnsupportedImage;
    
    // PDF detection
    const isPdf = mimeType === 'application/pdf' || fileExtension === 'pdf';
    
    // Text formats
    const textExtensions = ['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'ts', 'log'];
    const isText = mimeType?.startsWith('text/') || textExtensions.includes(fileExtension);
    
    // Office documents
    const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'];
    const isOffice = officeExtensions.includes(fileExtension) || 
      mimeType?.startsWith('application/vnd.ms-') ||
      mimeType?.startsWith('application/vnd.openxmlformats-');
    
    // Video formats
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
    const isVideo = mimeType?.startsWith('video/') || videoExtensions.includes(fileExtension);
    
    // Audio formats
    const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'];
    const isAudio = mimeType?.startsWith('audio/') || audioExtensions.includes(fileExtension);

    return { isImage, isDisplayableImage, isUnsupportedImage, fileExtension, isPdf, isText, isOffice, isVideo, isAudio };
  }, [filename, mimeType]);

  const { isImage, isDisplayableImage, isUnsupportedImage, fileExtension, isPdf, isText, isOffice, isVideo, isAudio } = fileTypeInfo;

  useEffect(() => {
    loadDocument();
  }, [documentId, retryCount]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-6">
        <SkeletonLoader lines={3} />
        <div className="mt-4 h-64 bg-gray-100 rounded animate-pulse relative">
          {loadProgress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
              <div 
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
          )}
        </div>
        {loadProgress > 0 && (
          <p className="mt-2 text-xs text-gray-500 text-center">
            Loading... {loadProgress}%
          </p>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 truncate">{filename}</h3>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={filename}
              className="ml-4 inline-block rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
            >
              Download
            </a>
          )}
        </div>
        <div className="p-6">
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">Error loading document</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="text-sm font-medium text-red-800 hover:text-red-900 underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRetrying ? 'Retrying...' : 'Try again'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 truncate">{filename}</h3>
        {downloadUrl && (
          <a
            href={downloadUrl}
            download={filename}
            className="ml-4 inline-block rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
          >
            Download
          </a>
        )}
      </div>
      <div className="p-4">
        {!viewUrl ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Preview not available</h3>
            <p className="mt-1 text-sm text-gray-500">
              Unable to generate preview. You can still download the file to view it.
            </p>
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={filename}
                className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Download to view
              </a>
            )}
          </div>
        ) : (
          <>
            {isDisplayableImage && (
              <div className="flex justify-center bg-gray-50 rounded-lg p-4">
                {viewUrl ? (
                  <img 
                    src={viewUrl} 
                    alt={filename} 
                    className="max-w-full max-h-[600px] h-auto rounded shadow-sm"
                    style={{ objectFit: 'contain' }}
                    onError={async (e) => {
                      const target = e.target as HTMLImageElement;
                      const failedUrl = target.src;
                      
                      // Create a proper error object with message
                      const errorMessage = `Image failed to load: ${failedUrl}`;
                      const error = new Error(errorMessage);
                      const detectedErrorType = determineErrorType(error);
                      
                      // Log the error with full context
                      try {
                        logViewerError(documentId, errorMessage, detectedErrorType, {
                          mimeType,
                          storageProvider,
                          filename,
                          viewUrl: failedUrl,
                          retryCount,
                        });
                      } catch (logErr) {
                        // Fallback logging if logViewerError fails
                        console.error('[Viewer Error] Failed to log error:', logErr);
                        console.error('[Viewer Error] Image load failed:', {
                          documentId,
                          errorType: detectedErrorType,
                          errorMessage,
                          context: {
                            mimeType,
                            storageProvider,
                            filename,
                            viewUrl: failedUrl,
                            retryCount,
                          },
                        });
                      }

                      // Try a HEAD probe for diagnostics
                      try {
                        const headResp = await fetch(failedUrl, { method: 'HEAD' });
                        console.log('[Viewer Diagnostics] Image HEAD response:', {
                          status: headResp.status,
                          contentType: headResp.headers.get('Content-Type') || headResp.headers.get('content-type'),
                          contentLength: headResp.headers.get('Content-Length') || headResp.headers.get('content-length'),
                        });
                      } catch (probeErr) {
                        console.warn('[Viewer Diagnostics] HEAD probe failed for image URL', failedUrl, probeErr);
                      }
                      
                      // If preview URL failed, try fallback to download endpoint
                      if (failedUrl !== `/api/documents/${documentId}/download?preview=true`) {
                        console.log('[Viewer] Attempting fallback to download endpoint...');
                        setViewUrl(`/api/documents/${documentId}/download?preview=true`);
                        setError(null); // Clear error to allow retry
                      } else {
                        // Both preview and download endpoint failed
                        setErrorType(detectedErrorType);
                        setError(getUserFriendlyErrorMessage(detectedErrorType, error, {
                          mimeType,
                          storageProvider,
                          filename,
                          viewUrl: failedUrl,
                        }));
                        setViewUrl(null);
                      }
                    }}
                    onLoad={() => {
                      // Clear any previous errors if image loads successfully
                      setError(null);
                      setErrorType(null);
                      // Note: render time is approximate since we don't track when image starts loading
                    }}
                  />
                ) : (
                  <div className="text-center py-12">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Image preview unavailable</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Unable to load image preview. Please download the file to view it.
                    </p>
                    {downloadUrl && (
                      <a
                        href={downloadUrl}
                        download={filename}
                        className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                      >
                        Download image
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {isImage && isUnsupportedImage && (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Preview not available for this image format</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {fileExtension === 'heic' || fileExtension === 'heif'
                    ? 'HEIC/HEIF images are not supported by most browsers. Please download to view.'
                    : 'This image format cannot be previewed safely in the browser. Please download to view.'}
                </p>
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download={filename}
                    className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    Download
                  </a>
                )}
              </div>
            )}
            {isPdf && (
              <div className="w-full h-[600px] border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                {viewUrl ? (
                  <embed 
                    src={viewUrl}
                    type="application/pdf"
                    className="w-full h-full"
                    title={`Preview of ${filename}`}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-gray-500">Loading PDF preview...</p>
                  </div>
                )}
              </div>
            )}
            {isText && (
              <div className="w-full">
                <iframe 
                  src={viewUrl} 
                  className="w-full h-[600px] border border-gray-200 rounded" 
                  title={filename}
                  onError={() => {
                    const error = new Error('Failed to load text preview');
                    const detectedErrorType = determineErrorType(error);
                    logViewerError(documentId, error, detectedErrorType, {
                      mimeType,
                      storageProvider,
                      filename,
                      viewUrl,
                    });
                    setErrorType(detectedErrorType);
                    setError(getUserFriendlyErrorMessage(detectedErrorType, error, {
                      mimeType,
                      storageProvider,
                      filename,
                    }));
                  }}
                />
              </div>
            )}
            {isVideo && (
              <div className="w-full">
                <video 
                  src={viewUrl} 
                  controls 
                  className="w-full max-h-[600px] rounded"
                  onError={() => {
                    const error = new Error('Failed to load video preview');
                    const detectedErrorType = determineErrorType(error);
                    logViewerError(documentId, error, detectedErrorType, {
                      mimeType,
                      storageProvider,
                      filename,
                      viewUrl,
                    });
                    setErrorType(detectedErrorType);
                    setError(getUserFriendlyErrorMessage(detectedErrorType, error, {
                      mimeType,
                      storageProvider,
                      filename,
                    }));
                  }}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
            {isAudio && (
              <div className="w-full">
                <audio 
                  src={viewUrl} 
                  controls 
                  className="w-full"
                  onError={() => {
                    const error = new Error('Failed to load audio preview');
                    const detectedErrorType = determineErrorType(error);
                    logViewerError(documentId, error, detectedErrorType, {
                      mimeType,
                      storageProvider,
                      filename,
                      viewUrl,
                    });
                    setErrorType(detectedErrorType);
                    setError(getUserFriendlyErrorMessage(detectedErrorType, error, {
                      mimeType,
                      storageProvider,
                      filename,
                    }));
                  }}
                >
                  Your browser does not support the audio tag.
                </audio>
              </div>
            )}
            {isOffice && (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Office Document</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Office documents cannot be previewed in the browser. Please download to view.
                </p>
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download={filename}
                    className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    Download to view
                  </a>
                )}
              </div>
            )}
            {!isDisplayableImage && !isPdf && !isText && !isVideo && !isAudio && !isOffice && (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Preview not available</h3>
                <p className="mt-1 text-sm text-gray-500">This file type cannot be previewed in the browser.</p>
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download={filename}
                    className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    Download to view
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

