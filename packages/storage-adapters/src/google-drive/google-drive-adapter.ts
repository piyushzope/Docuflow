import { google } from 'googleapis';
import { BaseStorageAdapter } from '../base-adapter';
import type { StorageFile, UploadOptions } from '../types';

export interface GoogleDriveStorageConfig {
  provider: 'google_drive';
  accessToken: string;
  refreshToken?: string;
  rootFolderId?: string;
}

export class GoogleDriveStorageAdapter extends BaseStorageAdapter {
  private drive: ReturnType<typeof google.drive>;
  private rootFolderId: string;

  constructor(config: GoogleDriveStorageConfig) {
    super();

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: config.accessToken,
      refresh_token: config.refreshToken,
    });

    this.drive = google.drive({ version: 'v3', auth: oauth2Client });
    this.rootFolderId = config.rootFolderId || 'root';
  }

  async uploadFile(
    file: Buffer | Uint8Array,
    filename: string,
    options?: UploadOptions
  ): Promise<{ path: string; url?: string }> {
    const folderPath = options?.folderPath || '';
    const parentFolderId = await this.ensureFolderExists(folderPath);

    const fileMetadata: any = {
      name: filename,
      parents: [parentFolderId],
    };

    if (options?.metadata) {
      fileMetadata.description = JSON.stringify(options.metadata);
    }

    const media = {
      mimeType: options?.metadata?.mimeType || 'application/octet-stream',
      body: Buffer.from(file),
    };

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, webViewLink',
    });

    return {
      path: response.data.id || '',
      url: response.data.webViewLink || undefined,
    };
  }

  async downloadFile(path: string): Promise<Buffer> {
    const response = await this.drive.files.get(
      {
        fileId: path,
        alt: 'media',
      },
      { responseType: 'arraybuffer' }
    );

    return Buffer.from(response.data as ArrayBuffer);
  }

  async deleteFile(path: string): Promise<void> {
    await this.drive.files.delete({
      fileId: path,
    });
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await this.drive.files.get({
        fileId: path,
        fields: 'id',
      });
      return true;
    } catch {
      return false;
    }
  }

  async listFiles(folderPath: string): Promise<StorageFile[]> {
    const folderId = await this.getFolderId(folderPath);

    const response = await this.drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, size, mimeType, modifiedTime)',
    });

    return (response.data.files || []).map((file) => ({
      path: file.id || '',
      name: file.name || '',
      size: parseInt(file.size || '0', 10),
      mimeType: file.mimeType || 'application/octet-stream',
      lastModified: file.modifiedTime
        ? new Date(file.modifiedTime)
        : undefined,
    }));
  }

  async createFolder(folderPath: string): Promise<string> {
    return await this.ensureFolderExists(folderPath);
  }

  async getPublicUrl(path: string): Promise<string | null> {
    try {
      const response = await this.drive.files.get({
        fileId: path,
        fields: 'webViewLink, webContentLink',
      });

      return response.data.webViewLink || response.data.webContentLink || null;
    } catch {
      return null;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.drive.files.get({
        fileId: this.rootFolderId,
        fields: 'id',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure a folder path exists, creating folders as needed
   * Returns the folder ID of the final folder in the path
   */
  private async ensureFolderExists(folderPath: string): Promise<string> {
    if (!folderPath) {
      return this.rootFolderId;
    }

    const parts = this.normalizePath(folderPath).split('/').filter((p) => p);
    let currentParentId = this.rootFolderId;

    for (const folderName of parts) {
      // Check if folder exists
      const existing = await this.findFolderByName(folderName, currentParentId);

      if (existing) {
        currentParentId = existing;
      } else {
        // Create folder
        const folder = await this.drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [currentParentId],
          },
          fields: 'id',
        });

        currentParentId = folder.data.id || currentParentId;
      }
    }

    return currentParentId;
  }

  /**
   * Find a folder by name within a parent folder
   */
  private async findFolderByName(
    name: string,
    parentId: string
  ): Promise<string | null> {
    try {
      const response = await this.drive.files.list({
        q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id)',
        pageSize: 1,
      });

      const files = response.data.files || [];
      return files.length > 0 ? files[0].id || null : null;
    } catch {
      return null;
    }
  }

  /**
   * Get folder ID from path
   */
  private async getFolderId(folderPath: string): Promise<string> {
    if (!folderPath) {
      return this.rootFolderId;
    }

    return await this.ensureFolderExists(folderPath);
  }
}
