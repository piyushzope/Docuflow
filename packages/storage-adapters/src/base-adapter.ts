import type { StorageAdapter, StorageFile, UploadOptions } from './types';

/**
 * Base abstract class for storage adapters
 * Provides common functionality and enforces interface
 */
export abstract class BaseStorageAdapter implements StorageAdapter {
  abstract uploadFile(
    file: Buffer | Uint8Array,
    filename: string,
    options?: UploadOptions
  ): Promise<{ path: string; url?: string }>;

  abstract downloadFile(path: string): Promise<Buffer>;

  abstract deleteFile(path: string): Promise<void>;

  abstract fileExists(path: string): Promise<boolean>;

  abstract listFiles(folderPath: string): Promise<StorageFile[]>;

  abstract createFolder(folderPath: string): Promise<string>;

  abstract getPublicUrl(path: string): Promise<string | null>;

  abstract testConnection(): Promise<boolean>;

  /**
   * Helper to normalize folder paths
   */
  protected normalizePath(path: string): string {
    // Remove leading/trailing slashes and normalize
    return path.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
  }

  /**
   * Helper to join paths
   */
  protected joinPath(...parts: string[]): string {
    return parts
      .filter((p) => p)
      .map((p) => this.normalizePath(p))
      .join('/');
  }

  /**
   * Helper to extract folder and filename from a path
   */
  protected parsePath(fullPath: string): { folder: string; filename: string } {
    const normalized = this.normalizePath(fullPath);
    const lastSlash = normalized.lastIndexOf('/');
    
    if (lastSlash === -1) {
      return { folder: '', filename: normalized };
    }

    return {
      folder: normalized.substring(0, lastSlash),
      filename: normalized.substring(lastSlash + 1),
    };
  }

  /**
   * Helper to generate a unique filename if file exists
   */
  protected async generateUniqueFilename(
    basePath: string,
    filename: string,
    overwrite: boolean = false
  ): Promise<string> {
    if (overwrite) {
      return this.joinPath(basePath, filename);
    }

    const { folder, filename: name } = this.parsePath(
      this.joinPath(basePath, filename)
    );
    const ext = name.substring(name.lastIndexOf('.'));
    const baseName = name.substring(0, name.lastIndexOf('.')) || name;

    let counter = 1;
    let uniqueName = name;

    while (await this.fileExists(this.joinPath(folder, uniqueName))) {
      uniqueName = `${baseName}_${counter}${ext}`;
      counter++;
    }

    return this.joinPath(folder, uniqueName);
  }
}
