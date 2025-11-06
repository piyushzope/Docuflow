/**
 * Error handling utilities for consistent error messages and handling
 */

/**
 * Standard API error response structure
 */
export interface ApiError {
  error: string;
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Create a standardized error response
 * @param error - Error message or Error object
 * @param code - Optional error code
 * @param details - Optional additional details
 * @returns ApiError object
 */
export function createApiError(
  error: string | Error,
  code?: string,
  details?: Record<string, unknown>
): ApiError {
  const message = error instanceof Error ? error.message : error;

  return {
    error: message,
    message,
    code,
    details,
  };
}

/**
 * User-friendly error messages for common scenarios
 */
export const ErrorMessages = {
  // Authentication
  UNAUTHORIZED: 'You must be logged in to access this resource.',
  FORBIDDEN: "You don't have permission to perform this action.",
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',

  // Organization
  NO_ORGANIZATION: 'Please create or join an organization first.',
  ORGANIZATION_NOT_FOUND: 'Organization not found.',

  // Documents
  DOCUMENT_NOT_FOUND: 'Document not found.',
  DOCUMENT_ACCESS_DENIED: "You don't have permission to access this document.",
  DOCUMENT_DOWNLOAD_FAILED: 'Failed to download document. Please try again.',

  // Requests
  REQUEST_NOT_FOUND: 'Document request not found.',
  REQUEST_ACCESS_DENIED: "You don't have permission to access this request.",

  // Storage
  STORAGE_NOT_FOUND: 'Storage configuration not found.',
  STORAGE_CONNECTION_FAILED: 'Failed to connect to storage. Please check your configuration.',
  STORAGE_UPLOAD_FAILED: 'Failed to upload file to storage.',
  STORAGE_DOWNLOAD_FAILED: 'Failed to download file from storage.',

  // Email
  EMAIL_ACCOUNT_NOT_FOUND: 'Email account not found.',
  EMAIL_ACCOUNT_INACTIVE: 'Email account is not active.',
  EMAIL_SEND_FAILED: 'Failed to send email. Please check your email configuration.',

  // OAuth
  OAUTH_FAILED: 'OAuth authentication failed. Please try again.',
  OAUTH_CONFIG_MISSING: 'OAuth configuration is missing. Please contact support.',
  OAUTH_TOKEN_EXPIRED: 'OAuth token has expired. Please reconnect your account.',

  // Validation
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_INPUT: 'Invalid input provided. Please check your data and try again.',
  REQUIRED_FIELD_MISSING: 'Required fields are missing.',

  // General
  NOT_FOUND: 'The requested resource was not found.',
  INTERNAL_ERROR: 'An internal error occurred. Please try again later.',
  NETWORK_ERROR: 'Network error occurred. Please check your connection and try again.',
} as const;

/**
 * Get a user-friendly error message from an error
 * @param error - Error object, string, or unknown
 * @param defaultMessage - Default message if error cannot be parsed
 * @returns User-friendly error message
 */
export function getErrorMessage(
  error: unknown,
  defaultMessage: string = ErrorMessages.INTERNAL_ERROR
): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message || defaultMessage;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message) || defaultMessage;
  }

  return defaultMessage;
}

/**
 * Check if an error is a known API error type
 * @param error - Error to check
 * @returns true if it's a known API error
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof (error as ApiError).error === 'string'
  );
}

/**
 * Extract error code from an error
 * @param error - Error object
 * @returns Error code or undefined
 */
export function getErrorCode(error: unknown): string | undefined {
  if (isApiError(error)) {
    return error.code;
  }

  if (error instanceof Error && 'code' in error) {
    return String(error.code);
  }

  return undefined;
}

/**
 * Check if error is a network error
 * @param error - Error to check
 * @returns true if network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('fetch') ||
      error.message.toLowerCase().includes('connection')
    );
  }

  return false;
}

/**
 * Check if error is an authentication error
 * @param error - Error to check
 * @returns true if authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('authentication') ||
      message.includes('session')
    );
  }

  return false;
}

/**
 * Format error for logging
 * @param error - Error to format
 * @param context - Additional context
 * @returns Formatted error object
 */
export function formatErrorForLogging(
  error: unknown,
  context?: Record<string, unknown>
): Record<string, unknown> {
  const errorMessage = getErrorMessage(error);
  const errorCode = getErrorCode(error);

  return {
    error: errorMessage,
    code: errorCode,
    type: error instanceof Error ? error.constructor.name : typeof error,
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  };
}

