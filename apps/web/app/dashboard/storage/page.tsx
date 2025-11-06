import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { StorageActionButtons } from '@/components/storage-action-buttons';
import { StorageErrorRecovery } from '@/components/storage-error-recovery';
import { EmptyState } from '@/components/empty-state';
import { DocumentTypeChart } from '@/components/charts/document-type-chart';
import { StorageUsageChart } from '@/components/charts/storage-usage-chart';
import {
  calculateDocumentTypeDistribution,
  calculateStorageUsageByProvider,
} from '@/lib/analytics';

export default async function StoragePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; details?: string; storage_id?: string; provider?: string }>;
}) {
  // Await searchParams as it's now a Promise in Next.js 15
  const params = await searchParams;
  
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  const organizationId = (profile as any)?.organization_id;
  if (!organizationId) {
    redirect('/dashboard/organization');
  }

  // Get active storage configurations and documents for charts
  const [
    { data: storageConfigs },
    { data: documents },
  ] = await Promise.all([
    supabase
      .from('storage_configs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false }) as any,
    supabase
      .from('documents')
      .select('file_type, mime_type, storage_provider, file_size')
      .eq('organization_id', organizationId),
  ]);

  // Calculate analytics
  const documentTypeDistribution = calculateDocumentTypeDistribution(documents || []);
  const storageUsageData = calculateStorageUsageByProvider(documents || []);

  // Fetch account info for OAuth-based configs that don't have it yet
  // This is a best-effort update - we don't fail if it doesn't work
  if (storageConfigs && storageConfigs.length > 0) {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (encryptionKey) {
      const { decrypt } = await import('@docuflow/shared');
      
      for (const config of storageConfigs as any[]) {
        const configData = config.config || {};
        const needsAccountInfo = 
          (config.provider === 'onedrive' || config.provider === 'google_drive') &&
          configData.encrypted_access_token &&
          !configData.account_email &&
          !configData.account_display_name;

        if (needsAccountInfo) {
          try {
            let accessToken: string | undefined;
            if (configData.encrypted_access_token) {
              accessToken = decrypt(configData.encrypted_access_token);
            }

            if (accessToken) {
              let accountEmail: string | undefined;
              let accountDisplayName: string | undefined;

              if (config.provider === 'onedrive') {
                const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  next: { revalidate: 0 }, // Don't cache
                });

                if (profileResponse.ok) {
                  const profile = await profileResponse.json();
                  accountEmail = profile.mail || profile.userPrincipalName;
                  accountDisplayName = profile.displayName || profile.givenName || accountEmail;
                }
              } else if (config.provider === 'google_drive') {
                const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                  next: { revalidate: 0 }, // Don't cache
                });

                if (profileResponse.ok) {
                  const profile = await profileResponse.json();
                  accountEmail = profile.email;
                  accountDisplayName = profile.name || profile.email;
                }
              }

              if (accountEmail || accountDisplayName) {
                // Update config with account info (non-blocking)
                const updatedConfig = {
                  ...configData,
                  account_email: accountEmail,
                  account_display_name: accountDisplayName,
                  connected_at: configData.connected_at || new Date().toISOString(),
                };

                await supabase
                  .from('storage_configs')
                  .update({
                    config: updatedConfig,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', config.id)
                  .eq('organization_id', organizationId);

                // Update the local config object so it displays immediately
                config.config = updatedConfig;
              }
            }
          } catch (error) {
            // Silently fail - don't block page rendering
            console.warn(`Failed to fetch account info for storage config ${config.id}:`, error);
          }
        }
      }
    }
  }

  const providerNames = {
    google_drive: 'Google Drive',
    onedrive: 'OneDrive',
    sharepoint: 'SharePoint',
    azure_blob: 'Azure Blob Storage',
    supabase: 'Supabase Storage',
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Storage Configuration</h1>
          <p className="mt-2 text-sm text-slate-600">
            Configure cloud storage destinations for your documents
          </p>
        </div>
        {params.error && (
          <StorageErrorRecovery
            error={params.error}
            details={params.details}
            storageId={params.storage_id}
            provider={params.provider as any}
          />
        )}

        {params.success && (
          <div className="mb-6 rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">
              {params.success === 'onedrive_connected' && 'OneDrive account connected successfully!'}
              {params.success === 'google_drive_connected' && 'Google Drive account connected successfully!'}
              {params.success && !['onedrive_connected', 'google_drive_connected'].includes(params.success) && 
                'Operation completed successfully!'}
            </p>
          </div>
        )}

        <div className="mb-8">
          <Link
            href="/dashboard/storage/new"
            className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Add Storage Provider
          </Link>
        </div>

        {/* Charts Section */}
        {documents && documents.length > 0 && (
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Document Types</h3>
              <DocumentTypeChart data={documentTypeDistribution} />
            </div>
            {storageUsageData.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Storage Usage</h3>
                <StorageUsageChart data={storageUsageData} />
              </div>
            )}
          </div>
        )}

        {storageConfigs && storageConfigs.length > 0 ? (
          <div className="space-y-4">
            {(storageConfigs as any[]).map((config: any) => {
              // Safely extract config data
              const configData = config.config || {};
              const accountEmail = configData.account_email;
              const accountDisplayName = configData.account_display_name;
              const rootFolderPath = configData.rootFolderPath;
              const rootFolderId = configData.rootFolderId;
              const connectedAt = configData.connected_at;
              
              return (
                <div
                  key={config.id}
                  className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {config.name}
                        </h3>
                        {config.is_default && (
                          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            Default
                          </span>
                        )}
                        {!config.is_active && (
                          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {providerNames[config.provider as keyof typeof providerNames] || config.provider}
                      </p>
                      
                      {/* Account details for OAuth-based providers */}
                      {(accountEmail || accountDisplayName) && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Account: </span>
                            {accountDisplayName && (
                              <span>{accountDisplayName}</span>
                            )}
                            {accountEmail && (
                              <span className="text-gray-600">
                                {accountDisplayName ? ` (${accountEmail})` : accountEmail}
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                      
                      {/* Root folder path for OneDrive/Google Drive */}
                      {(rootFolderPath || rootFolderId) && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Root Folder: </span>
                            <span className="text-gray-600">
                              {rootFolderPath || 
                               (rootFolderId && config.provider === 'google_drive' ? `Folder ID: ${rootFolderId}` : '')}
                            </span>
                          </p>
                        </div>
                      )}
                      
                      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span>
                          Created:{' '}
                          {new Date(config.created_at).toLocaleDateString()}
                        </span>
                        {config.updated_at && config.updated_at !== config.created_at && (
                          <span>
                            Last Updated:{' '}
                            {new Date(config.updated_at).toLocaleDateString()}
                          </span>
                        )}
                        {connectedAt && (
                          <span>
                            Connected:{' '}
                            {new Date(connectedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <StorageActionButtons
                      storageId={config.id}
                      storageName={config.name}
                      provider={config.provider}
                      hasTokens={Boolean(configData.encrypted_access_token)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No storage configurations yet"
            description="Configure your first storage provider to start storing documents"
            actionLabel="Add Storage"
            actionHref="/dashboard/storage/new"
          />
        )}
      </div>
    </>
  );
}
