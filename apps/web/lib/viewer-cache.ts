/**
 * Client-side caching for document preview URLs
 * Uses sessionStorage for persistence across page reloads
 */

const CACHE_PREFIX = 'docuflow_viewer_cache_';
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

interface CachedUrl {
  url: string;
  timestamp: number;
  documentId: string;
}

/**
 * Get cached preview URL for document
 */
export function getCachedPreviewUrl(documentId: string): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = sessionStorage.getItem(`${CACHE_PREFIX}${documentId}`);
    if (!cached) return null;

    const data: CachedUrl = JSON.parse(cached);
    const age = Date.now() - data.timestamp;

    // Check if cache is expired
    if (age > CACHE_EXPIRY_MS) {
      sessionStorage.removeItem(`${CACHE_PREFIX}${documentId}`);
      return null;
    }

    return data.url;
  } catch {
    // Cache corrupted or not available
    return null;
  }
}

/**
 * Cache preview URL for document
 */
export function setCachedPreviewUrl(documentId: string, url: string): void {
  if (typeof window === 'undefined') return;

  try {
    const data: CachedUrl = {
      url,
      timestamp: Date.now(),
      documentId,
    };
    sessionStorage.setItem(`${CACHE_PREFIX}${documentId}`, JSON.stringify(data));
  } catch {
    // Storage quota exceeded or not available - silently fail
  }
}

/**
 * Clear cached preview URL for document
 */
export function clearCachedPreviewUrl(documentId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(`${CACHE_PREFIX}${documentId}`);
}

/**
 * Clear all cached preview URLs
 */
export function clearAllCachedPreviewUrls(): void {
  if (typeof window === 'undefined') return;
  
  const keys = Object.keys(sessionStorage);
  keys.forEach(key => {
    if (key.startsWith(CACHE_PREFIX)) {
      sessionStorage.removeItem(key);
    }
  });
}

/**
 * Get retry delay with exponential backoff
 */
export function getRetryDelay(retryCount: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
  const baseDelay = 1000;
  const maxDelay = 10000;
  const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay; // Up to 30% jitter
  return delay + jitter;
}

