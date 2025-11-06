/**
 * Custom hook for consistent toast notification usage
 * Wraps sonner's toast with common patterns for the app
 */

import { toast } from 'sonner';

export interface ToastOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Toast utility hook with consistent patterns
 */
export function useToast() {
  return {
    /**
     * Show success toast
     */
    success: (message: string, options?: ToastOptions) => {
      return toast.success(message, {
        duration: options?.duration ?? 3000,
        ...options,
      });
    },

    /**
     * Show error toast
     */
    error: (message: string, options?: ToastOptions) => {
      return toast.error(message, {
        duration: options?.duration ?? 5000,
        ...options,
      });
    },

    /**
     * Show warning toast
     */
    warning: (message: string, options?: ToastOptions) => {
      return toast.warning(message, {
        duration: options?.duration ?? 4000,
        ...options,
      });
    },

    /**
     * Show info toast
     */
    info: (message: string, options?: ToastOptions) => {
      return toast.info(message, {
        duration: options?.duration ?? 3000,
        ...options,
      });
    },

    /**
     * Show loading toast (returns dismiss function)
     */
    loading: (message: string) => {
      return toast.loading(message);
    },

    /**
     * Show promise toast (handles async operations)
     */
    promise: <T,>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: any) => string);
      }
    ) => {
      return toast.promise(promise, messages);
    },
  };
}

/**
 * Helper function for API error handling with toast
 */
export function handleApiError(error: any, defaultMessage: string = 'An error occurred'): string {
  const message = error?.message || error?.error || defaultMessage;
  return message;
}

/**
 * Helper function for API calls with automatic toast notifications
 */
export async function apiCallWithToast<T>(
  fetchFn: () => Promise<Response>,
  options: {
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
    showSuccess?: boolean;
    showError?: boolean;
  } = {}
): Promise<T | null> {
  const {
    successMessage = 'Operation completed successfully',
    errorMessage = 'Operation failed',
    onSuccess,
    onError,
    showSuccess = true,
    showError = true,
  } = options;

  const toastInstance = useToast();

  try {
    const response = await fetchFn();
    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error || data.message || errorMessage;
      if (showError) {
        toastInstance.error(errorMsg);
      }
      if (onError) {
        onError(errorMsg);
      }
      return null;
    }

    if (showSuccess) {
      toastInstance.success(successMessage);
    }
    if (onSuccess) {
      onSuccess(data);
    }
    return data;
  } catch (error: any) {
    const errorMsg = handleApiError(error, errorMessage);
    if (showError) {
      toastInstance.error(errorMsg);
    }
    if (onError) {
      onError(errorMsg);
    }
    return null;
  }
}

