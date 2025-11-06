import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@docuflow/shared';

/**
 * Test storage connection and permissions
 * POST /api/storage/[id]/test-connection
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = await Promise.resolve(params);

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Please log in to continue' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'No organization', details: 'User must be part of an organization' },
        { status: 400 }
      );
    }

    // Get storage config
    const { data: storageConfig, error: configError } = await supabase
      .from('storage_configs')
      .select('*')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (configError || !storageConfig) {
      return NextResponse.json(
        { error: 'Storage configuration not found', details: configError?.message },
        { status: 404 }
      );
    }

    // Get encryption key
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Encryption key not configured' },
        { status: 500 }
      );
    }

    const configData = storageConfig.config as any || {};
    const results: any = {
      config_id: id,
      provider: storageConfig.provider,
      tests: [],
      overall: 'success',
    };

    // Test based on provider
    if (storageConfig.provider === 'onedrive') {
      const accessToken = configData.encrypted_access_token
        ? decrypt(configData.encrypted_access_token, encryptionKey)
        : configData.accessToken;

      if (!accessToken) {
        results.overall = 'failed';
        results.tests.push({
          name: 'Token Check',
          status: 'failed',
          error: 'Access token not found',
        });
      } else {
        // Test 1: Token validity
        try {
          const testResponse = await fetch('https://graph.microsoft.com/v1.0/me/drive/root', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (testResponse.ok) {
            results.tests.push({
              name: 'Token Validity',
              status: 'success',
              message: 'Access token is valid',
            });
          } else if (testResponse.status === 401) {
            results.overall = 'failed';
            results.tests.push({
              name: 'Token Validity',
              status: 'failed',
              error: 'Access token is expired or invalid',
            });
          } else {
            results.overall = 'failed';
            results.tests.push({
              name: 'Token Validity',
              status: 'failed',
              error: `API returned ${testResponse.status}: ${testResponse.statusText}`,
            });
          }
        } catch (error: any) {
          results.overall = 'failed';
          results.tests.push({
            name: 'Token Validity',
            status: 'failed',
            error: error.message || 'Network error',
          });
        }

        // Test 2: Folder permissions (if root folder path specified)
        if (configData.rootFolderPath) {
          try {
            const folderPath = encodeURI(configData.rootFolderPath);
            const folderResponse = await fetch(
              `https://graph.microsoft.com/v1.0/me/drive/root:/${folderPath}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );

            if (folderResponse.ok || folderResponse.status === 404) {
              results.tests.push({
                name: 'Folder Access',
                status: 'success',
                message: folderResponse.status === 404 
                  ? 'Root folder path accessible (will be created if needed)'
                  : 'Root folder exists and is accessible',
              });
            } else {
              results.overall = 'failed';
              results.tests.push({
                name: 'Folder Access',
                status: 'failed',
                error: `Cannot access folder: ${folderResponse.status} ${folderResponse.statusText}`,
              });
            }
          } catch (error: any) {
            results.overall = 'failed';
            results.tests.push({
              name: 'Folder Access',
              status: 'failed',
              error: error.message || 'Network error',
            });
          }
        }
      }
    } else if (storageConfig.provider === 'google_drive') {
      const accessToken = configData.encrypted_access_token
        ? decrypt(configData.encrypted_access_token, encryptionKey)
        : configData.accessToken;

      if (!accessToken) {
        results.overall = 'failed';
        results.tests.push({
          name: 'Token Check',
          status: 'failed',
          error: 'Access token not found',
        });
      } else {
        // Test 1: Token validity
        try {
          const testResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (testResponse.ok) {
            results.tests.push({
              name: 'Token Validity',
              status: 'success',
              message: 'Access token is valid',
            });
          } else if (testResponse.status === 401) {
            results.overall = 'failed';
            results.tests.push({
              name: 'Token Validity',
              status: 'failed',
              error: 'Access token is expired or invalid',
            });
          } else {
            results.overall = 'failed';
            results.tests.push({
              name: 'Token Validity',
              status: 'failed',
              error: `API returned ${testResponse.status}: ${testResponse.statusText}`,
            });
          }
        } catch (error: any) {
          results.overall = 'failed';
          results.tests.push({
            name: 'Token Validity',
            status: 'failed',
            error: error.message || 'Network error',
          });
        }
      }
    } else if (storageConfig.provider === 'supabase') {
      const bucket = configData.bucket || 'documents';
      
      // Test 1: Bucket access
      try {
        const { data, error: listError } = await supabase.storage.from(bucket).list('', { limit: 1 });
        
        if (listError) {
          results.overall = 'failed';
          results.tests.push({
            name: 'Bucket Access',
            status: 'failed',
            error: listError.message,
          });
        } else {
          results.tests.push({
            name: 'Bucket Access',
            status: 'success',
            message: `Bucket "${bucket}" is accessible`,
          });
        }
      } catch (error: any) {
        results.overall = 'failed';
        results.tests.push({
          name: 'Bucket Access',
          status: 'failed',
          error: error.message || 'Unknown error',
        });
      }
    }

    // Update last test time
    await supabase
      .from('storage_configs')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return NextResponse.json({
      success: results.overall === 'success',
      results,
      tested_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error testing storage connection:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

