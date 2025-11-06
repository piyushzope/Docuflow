/**
 * API helper utilities for consistent API responses
 */

import { NextResponse } from 'next/server';
import type { ApiError } from './errors';

/**
 * Standard API response structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Create a successful API response
 * @param data - Response data
 * @param message - Optional success message
 * @returns NextResponse with success data
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status }
  );
}

/**
 * Create an error API response
 * @param error - Error message or ApiError
 * @param status - HTTP status code (default: 400)
 * @returns NextResponse with error data
 */
export function createErrorResponse(
  error: string | ApiError,
  status: number = 400
): NextResponse<ApiResponse> {
  const errorMessage = typeof error === 'string' ? error : error.error;
  const errorDetails = typeof error === 'object' && 'details' in error ? error.details : undefined;

  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
      message: errorMessage,
      ...(errorDetails && { details: errorDetails }),
    },
    { status }
  );
}

/**
 * Create a not found response
 * @param message - Optional error message
 * @returns NextResponse with 404 status
 */
export function createNotFoundResponse(message: string = 'Resource not found'): NextResponse<ApiResponse> {
  return createErrorResponse(message, 404);
}

/**
 * Create an unauthorized response
 * @param message - Optional error message
 * @returns NextResponse with 401 status
 */
export function createUnauthorizedResponse(message: string = 'Unauthorized'): NextResponse<ApiResponse> {
  return createErrorResponse(message, 401);
}

/**
 * Create a forbidden response
 * @param message - Optional error message
 * @returns NextResponse with 403 status
 */
export function createForbiddenResponse(message: string = 'Forbidden'): NextResponse<ApiResponse> {
  return createErrorResponse(message, 403);
}

/**
 * Create an internal server error response
 * @param message - Optional error message
 * @returns NextResponse with 500 status
 */
export function createInternalErrorResponse(message: string = 'Internal server error'): NextResponse<ApiResponse> {
  return createErrorResponse(message, 500);
}

/**
 * Type guard for checking if response has data
 */
export function hasData<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Extract data from API response with type safety
 * @param response - API response
 * @returns Data if present, undefined otherwise
 */
export function extractData<T>(response: ApiResponse<T>): T | undefined {
  if (hasData(response)) {
    return response.data;
  }
  return undefined;
}

