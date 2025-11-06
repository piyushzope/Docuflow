import { Client } from '@microsoft/microsoft-graph-client';
import { BaseStorageAdapter } from '../base-adapter';
import type { StorageFile, UploadOptions } from '../types';

export interface OneDriveStorageConfig {
  provider: 'onedrive';
  accessToken: string;
  refreshToken?: string;
  rootFolderPath?: string; // optional base folder within drive
}

export class OneDriveStorageAdapter extends BaseStorageAdapter {
  private client: Client;
  private rootFolderPath: string;

  constructor(config: OneDriveStorageConfig) {
    super();

    this.client = Client.init({
      authProvider: (done) => done(null, config.accessToken),
    });

    this.rootFolderPath = this.normalizePath(config.rootFolderPath || '');
  }

  async uploadFile(
    file: Buffer | Uint8Array,
    filename: string,
    options?: UploadOptions
  ): Promise<{ path: string; url?: string }> {
    const folderPath = this.buildAbsolutePath(options?.folderPath || '');
    await this.ensureFolderExists(folderPath);

    const targetPath = this.joinPath(folderPath, filename);
    const apiPath = `/me/drive/root:/${encodeURI(targetPath)}:/content`;

    const response = await this.client.api(apiPath).put(file as any);
    const driveItemId = response?.id || response?.id === 0 ? String(response.id) : response?.id || '';

    // Get the web URL for the uploaded file
    let webUrl: string | undefined;
    try {
      const itemResponse = await this.client.api(`/me/drive/items/${driveItemId}`).select('webUrl').get();
      webUrl = itemResponse?.webUrl;
    } catch {
      // If webUrl retrieval fails, continue without it
      webUrl = undefined;
    }

    return {
      // Return the drive item id as the canonical path identifier (for API operations)
      // The actual file path is: targetPath (folderPath/filename)
      path: driveItemId,
      url: webUrl,
    };
  }

  /**
   * Get the file path and web URL from a drive item ID
   */
  async getFilePath(driveItemId: string): Promise<{ path: string; webUrl?: string } | null> {
    try {
      const item = await this.client
        .api(`/me/drive/items/${driveItemId}`)
        .select('id,name,parentReference,webUrl')
        .get();

      if (!item) return null;

      // Build path from parentReference
      let pathParts: string[] = [item.name];

      if (item.parentReference?.path) {
        // parentReference.path is like "/drive/root:/Documents/Subfolder"
        // Extract the path part after "root:"
        const parentPath = item.parentReference.path;
        const pathMatch = parentPath.match(/root:(.+)$/);
        if (pathMatch) {
          const parentPathPart = pathMatch[1].replace(/^\//, '');
          pathParts = parentPathPart ? [parentPathPart, item.name] : [item.name];
        }
      } else if (item.parentReference?.id && item.parentReference.id !== 'root') {
        // Recursively get parent path (with limit to avoid infinite loops)
        const parentPath = await this.getFilePath(item.parentReference.id);
        if (parentPath) {
          pathParts = [parentPath.path, item.name];
        }
      }

      const fullPath = pathParts.join('/').replace(/\/+/g, '/');

      return {
        path: fullPath,
        webUrl: item.webUrl,
      };
    } catch (error) {
      console.error(`Error retrieving OneDrive file path for ${driveItemId}:`, error);
      return null;
    }
  }

  async downloadFile(path: string): Promise<Buffer> {
    // Treat path as drive item id
    const apiPath = `/me/drive/items/${path}/content`;
    // microsoft-graph-client returns the raw body for content endpoints
    const data = await this.client.api(apiPath).get();
    
    // Handle Buffer directly
    if (Buffer.isBuffer(data)) {
      return data;
    }
    
    // Handle ReadableStream (Microsoft Graph sometimes returns this)
    if (data && typeof data === 'object' && 'getReader' in data && typeof (data as any).getReader === 'function') {
      const stream = data as ReadableStream<Uint8Array>;
      const chunks: Uint8Array[] = [];
      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      // Combine all chunks into a single buffer
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      return Buffer.from(combined);
    }
    
    // Handle objects with arrayBuffer method (Blob-like)
    if (data && typeof data === 'object' && 'arrayBuffer' in data && typeof (data as any).arrayBuffer === 'function') {
      const arrayBuffer = await (data as any).arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    
    // Handle ArrayBuffer
    if (data instanceof ArrayBuffer) {
      return Buffer.from(data);
    }
    
    // Handle Uint8Array
    if (data instanceof Uint8Array) {
      return Buffer.from(data);
    }
    
    // Fallback: try to convert
    try {
      return Buffer.from(data as any);
    } catch (error) {
      throw new Error(`Failed to convert OneDrive file data to Buffer: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteFile(path: string): Promise<void> {
    const apiPath = `/me/drive/items/${path}`;
    await this.client.api(apiPath).delete();
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      const apiPath = `/me/drive/items/${path}`;
      await this.client.api(apiPath).get();
      return true;
    } catch {
      return false;
    }
  }

  async listFiles(folderPath: string): Promise<StorageFile[]> {
    const abs = this.buildAbsolutePath(folderPath || '');
    const apiPath = abs ? `/me/drive/root:/${encodeURI(abs)}:/children` : `/me/drive/root/children`;
    const response = await this.client
      .api(apiPath)
      .select('id,name,size,file,folder,lastModifiedDateTime')
      .get();

    const items = response?.value || [];
    return items.map((item: any) => ({
      path: item.id,
      name: item.name,
      size: Number(item.size || 0),
      mimeType: item.file?.mimeType || 'application/octet-stream',
      lastModified: item.lastModifiedDateTime ? new Date(item.lastModifiedDateTime) : undefined,
    }));
  }

  async createFolder(folderPath: string): Promise<string> {
    const abs = this.buildAbsolutePath(folderPath || '');
    await this.ensureFolderExists(abs);
    return abs;
  }

  async getPublicUrl(path: string): Promise<string | null> {
    try {
      const apiPath = `/me/drive/items/${path}/createLink`;
      const body = { type: 'view', scope: 'anonymous' };
      const response = await this.client.api(apiPath).post(body);
      return response?.link?.webUrl || null;
    } catch {
      return null;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.api('/me/drive/root').get();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure a folder path exists, creating intermediate folders as needed.
   */
  private async ensureFolderExists(folderPath: string): Promise<void> {
    if (!folderPath) return; // root

    const parts = this.normalizePath(folderPath).split('/').filter(Boolean);
    let currentPath = '';

    for (const part of parts) {
      const nextPath = this.joinPath(currentPath, part);

      const exists = await this.folderExists(nextPath);
      if (!exists) {
        await this.createSingleFolder(currentPath, part);
      }

      currentPath = nextPath;
    }
  }

  private async folderExists(folderPath: string): Promise<boolean> {
    try {
      const apiPath = `/me/drive/root:/${encodeURI(this.normalizePath(folderPath))}`;
      const item = await this.client.api(apiPath).get();
      return !!item && !!item.folder;
    } catch {
      return false;
    }
  }

  private async createSingleFolder(parentPath: string, name: string): Promise<void> {
    const parentApi = parentPath
      ? `/me/drive/root:/${encodeURI(this.normalizePath(parentPath))}:/children`
      : `/me/drive/root/children`;

    await this.client.api(parentApi).post({
      name,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename',
    });
  }

  private buildAbsolutePath(path: string): string {
    const normalized = this.normalizePath(path);
    if (this.rootFolderPath) {
      return this.joinPath(this.rootFolderPath, normalized);
    }
    return normalized;
  }
}


