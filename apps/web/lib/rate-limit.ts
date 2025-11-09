// Simple in-memory rate limiter for edge-safe per-IP rate limiting
// For production, consider using Redis or a distributed cache

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (cleans up expired entries periodically)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (e.g., IP address)
 * @param options - Rate limit options
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { maxRequests: 5, windowMs: 15 * 60 * 1000 } // 5 requests per 15 minutes
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // If no entry or entry expired, create new entry
  if (!entry || now > entry.resetTime) {
    const resetTime = now + options.windowMs;
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime,
    });
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetTime,
    };
  }

  // Entry exists and is valid
  if (entry.count >= options.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count += 1;
  rateLimitStore.set(identifier, entry);

  return {
    allowed: true,
    remaining: options.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Get rate limit status without incrementing
 */
export function getRateLimitStatus(
  identifier: string,
  options: RateLimitOptions = { maxRequests: 5, windowMs: 15 * 60 * 1000 }
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    return {
      allowed: true,
      remaining: options.maxRequests,
      resetTime: now + options.windowMs,
    };
  }

  return {
    allowed: entry.count < options.maxRequests,
    remaining: Math.max(0, options.maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}

