/**
 * Shared utility functions for the Docuflow application
 */

/**
 * Format bytes to human-readable file size
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number | null | undefined, decimals: number = 1): string {
  if (bytes === null || bytes === undefined) {
    return '—';
  }

  if (bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format date to localized date string
 * @param date - Date string, Date object, or null/undefined
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string or '—' if null/undefined
 */
export function formatDate(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) {
    return '—';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '—';
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return new Intl.DateTimeFormat('en-US', options || defaultOptions).format(dateObj);
}

/**
 * Format date and time to localized string
 * @param date - Date string, Date object, or null/undefined
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date/time string or '—' if null/undefined
 */
export function formatDateTime(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) {
    return '—';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '—';
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };

  return new Intl.DateTimeFormat('en-US', options || defaultOptions).format(dateObj);
}

/**
 * Format date to relative time (e.g., "2 hours ago", "yesterday")
 * @param date - Date string, Date object, or null/undefined
 * @returns Relative time string or '—' if null/undefined
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) {
    return '—';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '—';
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }
}

/**
 * Truncate text to a maximum length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add when truncated (default: '...')
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Get status badge color classes
 * @param status - Status string
 * @returns Tailwind CSS classes for status badge
 */
export function getStatusBadgeClasses(status: string): string {
  const statusLower = status.toLowerCase();

  if (statusLower === 'verified' || statusLower === 'completed' || statusLower === 'sent') {
    return 'bg-green-100 text-green-800';
  } else if (statusLower === 'processed' || statusLower === 'active') {
    return 'bg-blue-100 text-blue-800';
  } else if (statusLower === 'rejected' || statusLower === 'failed' || statusLower === 'error') {
    return 'bg-red-100 text-red-800';
  } else if (statusLower === 'pending' || statusLower === 'verifying') {
    return 'bg-yellow-100 text-yellow-800';
  } else if (statusLower === 'expired' || statusLower === 'inactive') {
    return 'bg-gray-100 text-gray-800';
  }

  return 'bg-gray-100 text-gray-800';
}

/**
 * Get action color classes for activity logs
 * @param action - Action string
 * @returns Tailwind CSS classes for action text
 */
export function getActionColorClasses(action: string): string {
  const actionLower = action.toLowerCase();

  if (actionLower === 'create' || actionLower === 'add') {
    return 'text-green-600';
  } else if (actionLower === 'update' || actionLower === 'edit') {
    return 'text-blue-600';
  } else if (actionLower === 'delete' || actionLower === 'remove') {
    return 'text-red-600';
  } else if (actionLower === 'send' || actionLower === 'notify') {
    return 'text-purple-600';
  }

  return 'text-gray-900';
}

/**
 * Validate email address
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email) {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Extract file extension from filename
 * @param filename - Filename
 * @returns File extension (without dot) or empty string
 */
export function getFileExtension(filename: string): string {
  if (!filename) {
    return '';
  }

  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return '';
  }

  return filename.substring(lastDot + 1).toLowerCase();
}

/**
 * Check if a file type is an image
 * @param mimeType - MIME type or filename
 * @returns true if image, false otherwise
 */
export function isImageFile(mimeType: string | null | undefined): boolean {
  if (!mimeType) {
    return false;
  }

  return mimeType.startsWith('image/');
}

/**
 * Check if a file type is a PDF
 * @param mimeType - MIME type or filename
 * @returns true if PDF, false otherwise
 */
export function isPdfFile(mimeType: string | null | undefined): boolean {
  if (!mimeType) {
    return false;
  }

  return mimeType === 'application/pdf' || mimeType.toLowerCase().endsWith('.pdf');
}

/**
 * Check if a file type is text
 * @param mimeType - MIME type or filename
 * @returns true if text, false otherwise
 */
export function isTextFile(mimeType: string | null | undefined): boolean {
  if (!mimeType) {
    return false;
  }

  return mimeType.startsWith('text/');
}

/**
 * Format status for display (capitalize, replace underscores)
 * @param status - Status string
 * @returns Formatted status string
 */
export function formatStatus(status: string): string {
  if (!status) {
    return '';
  }

  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

