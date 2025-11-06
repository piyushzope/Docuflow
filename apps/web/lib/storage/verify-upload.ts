/**
 * Verify that a file exists in storage after upload
 * Supports OneDrive, Google Drive, and Supabase Storage
 */

interface VerificationResult {
  verified: boolean;
  status: 'verified' | 'not_found' | 'error';
  error?: string;
  fileDetails?: {
    path: string;
    size?: number;
    webUrl?: string;
  };
}

/**
 * Verify OneDrive file exists by ID
 */
export async function verifyOneDriveFile(
  accessToken: string,
  fileId: string
): Promise<VerificationResult> {
  try {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}?$select=id,name,size,webUrl`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          verified: false,
          status: 'not_found',
          error: 'File not found in OneDrive',
        };
      }
      const errorText = await response.text();
      return {
        verified: false,
        status: 'error',
        error: `OneDrive API error (${response.status}): ${errorText}`,
      };
    }

    const item = await response.json();
    return {
      verified: true,
      status: 'verified',
      fileDetails: {
        path: item.name || fileId,
        size: item.size,
        webUrl: item.webUrl,
      },
    };
  } catch (error: any) {
    return {
      verified: false,
      status: 'error',
      error: error?.message || 'Failed to verify OneDrive file',
    };
  }
}

/**
 * Verify Google Drive file exists by ID
 */
export async function verifyGoogleDriveFile(
  accessToken: string,
  fileId: string
): Promise<VerificationResult> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,size,webViewLink`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          verified: false,
          status: 'not_found',
          error: 'File not found in Google Drive',
        };
      }
      const errorText = await response.text();
      return {
        verified: false,
        status: 'error',
        error: `Google Drive API error (${response.status}): ${errorText}`,
      };
    }

    const file = await response.json();
    return {
      verified: true,
      status: 'verified',
      fileDetails: {
        path: file.name || fileId,
        size: file.size ? parseInt(file.size, 10) : undefined,
        webUrl: file.webViewLink,
      },
    };
  } catch (error: any) {
    return {
      verified: false,
      status: 'error',
      error: error?.message || 'Failed to verify Google Drive file',
    };
  }
}

/**
 * Verify Supabase Storage file exists
 */
export async function verifySupabaseFile(
  supabase: any,
  bucket: string,
  path: string
): Promise<VerificationResult> {
  try {
    // Try to get file info
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path.split('/').slice(0, -1).join('/'), {
        search: path.split('/').pop(),
      });

    if (error) {
      return {
        verified: false,
        status: 'error',
        error: `Supabase Storage error: ${error.message}`,
      };
    }

    const fileName = path.split('/').pop();
    const fileExists = data?.some((file: any) => file.name === fileName);

    if (!fileExists) {
      return {
        verified: false,
        status: 'not_found',
        error: 'File not found in Supabase Storage',
      };
    }

    return {
      verified: true,
      status: 'verified',
      fileDetails: {
        path,
        size: data?.find((f: any) => f.name === fileName)?.metadata?.size,
      },
    };
  } catch (error: any) {
    return {
      verified: false,
      status: 'error',
      error: error?.message || 'Failed to verify Supabase Storage file',
    };
  }
}

/**
 * Verify file exists in storage based on provider
 */
export async function verifyFileUpload(
  provider: 'onedrive' | 'google_drive' | 'supabase',
  storagePath: string,
  options: {
    accessToken?: string;
    supabase?: any;
    bucket?: string;
  }
): Promise<VerificationResult> {
  switch (provider) {
    case 'onedrive':
      if (!options.accessToken) {
        return {
          verified: false,
          status: 'error',
          error: 'OneDrive access token required',
        };
      }
      return verifyOneDriveFile(options.accessToken, storagePath);

    case 'google_drive':
      if (!options.accessToken) {
        return {
          verified: false,
          status: 'error',
          error: 'Google Drive access token required',
        };
      }
      return verifyGoogleDriveFile(options.accessToken, storagePath);

    case 'supabase':
      if (!options.supabase || !options.bucket) {
        return {
          verified: false,
          status: 'error',
          error: 'Supabase client and bucket required',
        };
      }
      return verifySupabaseFile(options.supabase, options.bucket, storagePath);

    default:
      return {
        verified: false,
        status: 'error',
        error: `Unsupported storage provider: ${provider}`,
      };
  }
}

