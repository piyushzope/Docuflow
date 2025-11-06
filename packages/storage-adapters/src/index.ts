export * from './types';
export * from './base-adapter';
export { SupabaseStorageAdapter } from './supabase/supabase-adapter';
export type { SupabaseStorageConfig } from './supabase/supabase-adapter';
export { GoogleDriveStorageAdapter } from './google-drive/google-drive-adapter';
export type { GoogleDriveStorageConfig } from './google-drive/google-drive-adapter';
export { OneDriveStorageAdapter } from './onedrive/onedrive-adapter';
export type { OneDriveStorageConfig } from './onedrive/onedrive-adapter';

import type { StorageProvider, StorageConfig, StorageAdapter } from './types';
import { SupabaseStorageAdapter } from './supabase/supabase-adapter';
import type { SupabaseStorageConfig } from './supabase/supabase-adapter';
import { GoogleDriveStorageAdapter } from './google-drive/google-drive-adapter';
import type { GoogleDriveStorageConfig } from './google-drive/google-drive-adapter';
import { OneDriveStorageAdapter } from './onedrive/onedrive-adapter';
import type { OneDriveStorageConfig } from './onedrive/onedrive-adapter';

export interface OneDriveStorageConfig extends StorageConfig {
  provider: 'onedrive';
  accessToken: string;
  refreshToken?: string;
  rootFolderId?: string;
}

export interface SharePointStorageConfig extends StorageConfig {
  provider: 'sharepoint';
  accessToken: string;
  refreshToken?: string;
  siteId: string;
  driveId?: string;
}

export interface AzureBlobStorageConfig extends StorageConfig {
  provider: 'azure_blob';
  connectionString: string;
  containerName: string;
}

/**
 * Create a storage adapter based on the provider and config
 */
export function createStorageAdapter(
  config: StorageConfig
): StorageAdapter {
  switch (config.provider) {
    case 'supabase':
      return new SupabaseStorageAdapter(
        config as SupabaseStorageConfig
      );
    case 'google_drive':
      return new GoogleDriveStorageAdapter(
        config as GoogleDriveStorageConfig
      );
    case 'onedrive':
      return new OneDriveStorageAdapter(
        config as unknown as OneDriveStorageConfig
      );
    case 'sharepoint':
      // TODO: Implement SharePointStorageAdapter
      throw new Error('SharePoint adapter not yet implemented');
    case 'azure_blob':
      // TODO: Implement AzureBlobStorageAdapter
      throw new Error('Azure Blob Storage adapter not yet implemented');
    default:
      throw new Error(`Unsupported storage provider: ${(config as any).provider}`);
  }
}
