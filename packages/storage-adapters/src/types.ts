export type StorageProvider =
  | 'google_drive'
  | 'onedrive'
  | 'sharepoint'
  | 'azure_blob'
  | 'supabase';

export interface StorageFile {
  path: string;
  name: string;
  size: number;
  mimeType: string;
  lastModified?: Date;
}

export interface StorageConfig {
  provider: StorageProvider;
  [key: string]: unknown;
}

export interface UploadOptions {
  folderPath?: string;
  metadata?: Record<string, string>;
  overwrite?: boolean;
}

export interface StorageAdapter {
  /**
   * Upload a file to storage
   */
  uploadFile(
    file: Buffer | Uint8Array,
    filename: string,
    options?: UploadOptions
  ): Promise<{ path: string; url?: string }>;

  /**
   * Download a file from storage
   */
  downloadFile(path: string): Promise<Buffer>;

  /**
   * Delete a file from storage
   */
  deleteFile(path: string): Promise<void>;

  /**
   * Check if a file exists
   */
  fileExists(path: string): Promise<boolean>;

  /**
   * List files in a directory
   */
  listFiles(folderPath: string): Promise<StorageFile[]>;

  /**
   * Create a directory/folder
   */
  createFolder(folderPath: string): Promise<string>;

  /**
   * Get a public URL for a file (if supported)
   */
  getPublicUrl(path: string): Promise<string | null>;

  /**
   * Test the storage connection
   */
  testConnection(): Promise<boolean>;
}
