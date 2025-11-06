/**
 * Viewer error logging utilities
 * Provides structured logging for document viewer issues
 */

export type ViewerErrorType = 'network' | 'format' | 'auth' | 'storage' | 'unknown';

export interface ViewerError {
  documentId: string;
  timestamp: string;
  errorType: ViewerErrorType;
  errorMessage: string;
  context: {
    mimeType?: string;
    storageProvider?: string;
    fileSize?: number;
    browser?: string;
    userAgent?: string;
    filename?: string;
    viewUrl?: string;
    httpStatus?: number;
    retryCount?: number;
  };
}

export interface ViewerPerformanceMetrics {
  documentId: string;
  timestamp: string;
  action: 'load' | 'render' | 'download';
  duration: number;
  context: {
    mimeType?: string;
    fileSize?: number;
    storageProvider?: string;
    cached?: boolean;
  };
}

/**
 * Log viewer error with structured context
 */
export function logViewerError(
  documentId: string,
  error: Error | string,
  errorType: ViewerErrorType,
  context?: Partial<ViewerError['context']>
): ViewerError {
  // Extract error message safely
  let errorMessage: string;
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message || 'Unknown error';
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorMessage = String(error.message) || 'Unknown error';
  } else {
    errorMessage = 'Unknown error';
  }
  
  // Ensure documentId is valid
  const safeDocumentId = documentId || 'unknown';
  
  const viewerError: ViewerError = {
    documentId: safeDocumentId,
    timestamp: new Date().toISOString(),
    errorType,
    errorMessage,
    context: {
      browser: typeof window !== 'undefined' ? getBrowserInfo() : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      ...context,
    },
  };

  // Log to console with structured format
  // Create a plain object to avoid serialization issues
  const logData: Record<string, any> = {
    documentId: String(viewerError.documentId || 'unknown'),
    errorType: String(viewerError.errorType || 'unknown'),
    errorMessage: String(viewerError.errorMessage || 'Unknown error'),
    timestamp: viewerError.timestamp,
  };
  
  // Add context properties individually to ensure they're included
  if (viewerError.context) {
    if (viewerError.context.mimeType) logData.mimeType = String(viewerError.context.mimeType);
    if (viewerError.context.storageProvider) logData.storageProvider = String(viewerError.context.storageProvider);
    if (viewerError.context.filename) logData.filename = String(viewerError.context.filename);
    if (viewerError.context.viewUrl) logData.viewUrl = String(viewerError.context.viewUrl);
    if (viewerError.context.fileSize !== undefined) logData.fileSize = viewerError.context.fileSize;
    if (viewerError.context.httpStatus !== undefined) logData.httpStatus = viewerError.context.httpStatus;
    if (viewerError.context.retryCount !== undefined) logData.retryCount = viewerError.context.retryCount;
    if (viewerError.context.browser) logData.browser = String(viewerError.context.browser);
    if (viewerError.context.userAgent) logData.userAgent = String(viewerError.context.userAgent);
  }
  
  try {
    console.error('[Viewer Error]', logData);
  } catch (consoleErr) {
    // Fallback if console.error fails (shouldn't happen, but be safe)
    console.error('[Viewer Error] Failed to log structured error:', consoleErr);
    console.error('[Viewer Error] Document ID:', documentId);
    console.error('[Viewer Error] Error Type:', errorType);
    console.error('[Viewer Error] Error Message:', errorMessage);
  }

  // In production, could send to error tracking service
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // TODO: Send to error tracking service (e.g., Sentry, LogRocket)
    try {
      // Could use fetch to send to diagnostics endpoint
      fetch(`/api/documents/${documentId}/diagnostics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(viewerError),
      }).catch(() => {
        // Silently fail - don't break the app if logging fails
      });
    } catch {
      // Silently fail
    }
  }

  return viewerError;
}

/**
 * Log viewer performance metrics
 */
export function logViewerPerformance(
  documentId: string,
  action: ViewerPerformanceMetrics['action'],
  duration: number,
  context?: Partial<ViewerPerformanceMetrics['context']>
): ViewerPerformanceMetrics {
  const metrics: ViewerPerformanceMetrics = {
    documentId,
    timestamp: new Date().toISOString(),
    action,
    duration,
    context: {
      ...context,
    },
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Viewer Performance]', metrics);
  }

  return metrics;
}

/**
 * Get browser information
 */
function getBrowserInfo(): string {
  if (typeof navigator === 'undefined') return 'unknown';

  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  return 'unknown';
}

/**
 * Determine error type from error message
 */
export function determineErrorType(error: Error | string, httpStatus?: number): ViewerErrorType {
  const message = typeof error === 'string' ? error : error.message;
  const lowerMessage = message.toLowerCase();

  if (httpStatus === 401 || httpStatus === 403 || lowerMessage.includes('unauthorized') || lowerMessage.includes('authentication') || lowerMessage.includes('token')) {
    return 'auth';
  }

  if (httpStatus === 404 || lowerMessage.includes('not found') || lowerMessage.includes('missing')) {
    return 'storage';
  }

  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('timeout') || lowerMessage.includes('connection')) {
    return 'network';
  }

  if (lowerMessage.includes('format') || lowerMessage.includes('mime') || lowerMessage.includes('unsupported') || lowerMessage.includes('corrupted')) {
    return 'format';
  }

  return 'unknown';
}

/**
 * Get user-friendly error message with actionable steps
 */
export function getUserFriendlyErrorMessage(
  errorType: ViewerErrorType,
  error: Error | string,
  context?: Partial<ViewerError['context']>
): string {
  const baseMessage = typeof error === 'string' ? error : error.message;

  switch (errorType) {
    case 'auth':
      return 'Authentication failed. Please reconnect your storage account or contact your administrator.';
    
    case 'network':
      return 'Network error. Please check your internet connection and try again.';
    
    case 'format':
      if (context?.mimeType?.includes('image')) {
        return 'This image format is not supported by your browser. Please download the file to view it.';
      }
      if (context?.mimeType?.includes('pdf')) {
        return 'PDF preview failed. Please download the file to view it.';
      }
      return 'This file format cannot be previewed. Please download the file to view it.';
    
    case 'storage':
      return 'File not found in storage. This may indicate the file was moved or deleted.';
    
    default:
      return baseMessage || 'An unexpected error occurred. Please try again or contact support.';
  }
}

