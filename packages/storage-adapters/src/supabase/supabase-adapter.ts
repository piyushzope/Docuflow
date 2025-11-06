import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BaseStorageAdapter } from '../base-adapter';
import type { StorageFile, UploadOptions } from '../types';

export interface SupabaseStorageConfig {
  supabaseUrl: string;
  supabaseKey: string;
  bucket: string;
}

export class SupabaseStorageAdapter extends BaseStorageAdapter {
  private supabase: SupabaseClient;
  private bucket: string;

  constructor(config: SupabaseStorageConfig) {
    super();
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.bucket = config.bucket;
  }

  async uploadFile(
    file: Buffer | Uint8Array,
    filename: string,
    options?: UploadOptions
  ): Promise<{ path: string; url?: string }> {
    const path = options?.folderPath
      ? this.joinPath(options.folderPath, filename)
      : filename;

    const normalizedPath = this.normalizePath(path);

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .upload(normalizedPath, file, {
        upsert: options?.overwrite ?? false,
        contentType: options?.metadata?.mimeType,
        metadata: options?.metadata,
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(normalizedPath);

    return {
      path: normalizedPath,
      url: urlData.publicUrl,
    };
  }

  async downloadFile(path: string): Promise<Buffer> {
    const normalizedPath = this.normalizePath(path);

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .download(normalizedPath);

    if (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from storage');
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async deleteFile(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([normalizedPath]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async fileExists(path: string): Promise<boolean> {
    const normalizedPath = this.normalizePath(path);

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .list(this.parsePath(normalizedPath).folder, {
        limit: 1,
        search: this.parsePath(normalizedPath).filename,
      });

    if (error) {
      return false;
    }

    return (data?.length ?? 0) > 0;
  }

  async listFiles(folderPath: string): Promise<StorageFile[]> {
    const normalizedPath = this.normalizePath(folderPath);

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .list(normalizedPath);

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return (data || []).map((file) => ({
      path: this.joinPath(normalizedPath, file.name),
      name: file.name,
      size: file.metadata?.size || 0,
      mimeType: file.metadata?.mimetype || 'application/octet-stream',
      lastModified: file.updated_at ? new Date(file.updated_at) : undefined,
    }));
  }

  async createFolder(folderPath: string): Promise<string> {
    // Supabase Storage doesn't have explicit folders, but we can create a placeholder file
    const normalizedPath = this.normalizePath(folderPath);
    const placeholderPath = this.joinPath(normalizedPath, '.keep');

    // Check if folder already exists by trying to list it
    try {
      await this.listFiles(normalizedPath);
      return normalizedPath;
    } catch {
      // Folder doesn't exist, create placeholder
      await this.supabase.storage
        .from(this.bucket)
        .upload(placeholderPath, new Uint8Array(0));

      return normalizedPath;
    }
  }

  async getPublicUrl(path: string): Promise<string | null> {
    const normalizedPath = this.normalizePath(path);
    const { data } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(normalizedPath);
    return data.publicUrl;
  }

  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .list('', { limit: 1 });

      return !error;
    } catch {
      return false;
    }
  }
}
