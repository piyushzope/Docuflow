'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { LoadingButton } from '@/components/loading-button';

type StorageProvider = 'google_drive' | 'onedrive' | 'sharepoint' | 'azure_blob' | 'supabase';

const providerOptions: { value: StorageProvider; label: string; description: string }[] = [
  {
    value: 'supabase',
    label: 'Supabase Storage',
    description: 'Store documents in Supabase Storage (recommended for quick setup)',
  },
  {
    value: 'google_drive',
    label: 'Google Drive',
    description: 'Store documents in Google Drive folders',
  },
  {
    value: 'onedrive',
    label: 'OneDrive',
    description: 'Store documents in OneDrive folders',
  },
  {
    value: 'sharepoint',
    label: 'SharePoint',
    description: 'Store documents in SharePoint sites',
  },
  {
    value: 'azure_blob',
    label: 'Azure Blob Storage',
    description: 'Store documents in Azure Blob Storage containers',
  },
];

export default function NewStoragePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    provider: '' as StorageProvider | '',
    name: '',
    is_default: false,
    // Provider-specific config fields
    folder_path: '', // For Google Drive, OneDrive, SharePoint
    container_name: '', // For Azure Blob
    site_url: '', // For SharePoint
    access_token: '', // For OAuth-based providers (will be handled separately)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        setError('Please create or join an organization first');
        setLoading(false);
        return;
      }

      if (!formData.provider || !formData.name) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Build config object based on provider
      let config: Record<string, unknown> = {};
      
      if (formData.provider === 'azure_blob') {
        if (!formData.container_name) {
          setError('Container name is required for Azure Blob Storage');
          setLoading(false);
          return;
        }
        config = {
          container_name: formData.container_name,
        };
      } else if (formData.provider === 'sharepoint') {
        if (!formData.site_url) {
          setError('Site URL is required for SharePoint');
          setLoading(false);
          return;
        }
        config = {
          site_url: formData.site_url,
          folder_path: formData.folder_path || 'Documents',
        };
      } else if (formData.provider === 'google_drive' || formData.provider === 'onedrive') {
        config = {
          folder_path: formData.folder_path || 'Documents',
          // OAuth tokens will be added separately via OAuth flow
        };
      } else if (formData.provider === 'supabase') {
        config = {
          bucket: 'documents', // Default bucket name
          folder_path: formData.folder_path || '',
        };
      }

      // Check if this should be the default storage
      let isDefault = formData.is_default;
      if (isDefault) {
        // If setting as default, unset other defaults
        const { data: existingConfigs } = await supabase
          .from('storage_configs')
          .select('id')
          .eq('organization_id', profile.organization_id)
          .eq('is_default', true);

        if (existingConfigs && existingConfigs.length > 0) {
          // Update existing defaults to false
          await supabase
            .from('storage_configs')
            .update({ is_default: false })
            .eq('organization_id', profile.organization_id)
            .eq('is_default', true);
        }
      } else {
        // If not setting as default, check if there are any existing configs
        const { data: existingConfigs } = await supabase
          .from('storage_configs')
          .select('id')
          .eq('organization_id', profile.organization_id)
          .eq('is_active', true);

        // If this is the first config, make it default
        if (!existingConfigs || existingConfigs.length === 0) {
          isDefault = true;
        }
      }

      // Create storage config
      const { data: newStorageConfig, error: insertError } = await supabase
        .from('storage_configs')
        .insert({
          organization_id: profile.organization_id,
          provider: formData.provider,
          name: formData.name,
          config: config,
          is_default: isDefault,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        organization_id: profile.organization_id,
        user_id: user.id,
        action: 'create',
        resource_type: 'storage_config',
        details: {
          provider: formData.provider,
          name: formData.name,
        },
      });

      // For OAuth-based providers, redirect to OAuth flow after creation
      if (formData.provider === 'onedrive') {
        router.push(`/auth/onedrive?storage_id=${(newStorageConfig as any).id}`);
      } else if (formData.provider === 'google_drive') {
        // TODO: Implement Google Drive OAuth for storage
        router.push('/dashboard/storage?success=created');
      } else {
        router.push('/dashboard/storage?success=created');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create storage configuration');
      setLoading(false);
    }
  };

  const selectedProvider = providerOptions.find((p) => p.value === formData.provider);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Add Storage Provider</h1>
            <Link
              href="/dashboard/storage"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← Cancel
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
          <div>
            <label
              htmlFor="provider"
              className="block text-sm font-medium text-gray-700"
            >
              Storage Provider *
            </label>
            <select
              id="provider"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              value={formData.provider}
              onChange={(e) =>
                setFormData({ ...formData, provider: e.target.value as StorageProvider })
              }
            >
              <option value="">Select a provider...</option>
              {providerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {selectedProvider && (
              <p className="mt-1 text-xs text-gray-500">{selectedProvider.description}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Configuration Name *
            </label>
            <input
              type="text"
              id="name"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              placeholder="e.g., Main Google Drive"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
            <p className="mt-1 text-xs text-gray-500">
              A friendly name to identify this storage configuration
            </p>
          </div>

          {/* Provider-specific fields */}
          {formData.provider === 'google_drive' || formData.provider === 'onedrive' ? (
            <div>
              <label
                htmlFor="folder_path"
                className="block text-sm font-medium text-gray-700"
              >
                Folder Path
              </label>
              <input
                type="text"
                id="folder_path"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                placeholder="Documents"
                value={formData.folder_path}
                onChange={(e) =>
                  setFormData({ ...formData, folder_path: e.target.value })
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                The folder path where documents will be stored (default: "Documents").
                Note: You'll need to connect your account via OAuth to complete setup.
              </p>
            </div>
          ) : null}

          {formData.provider === 'sharepoint' ? (
            <>
              <div>
                <label
                  htmlFor="site_url"
                  className="block text-sm font-medium text-gray-700"
                >
                  SharePoint Site URL *
                </label>
                <input
                  type="url"
                  id="site_url"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                  placeholder="https://yourtenant.sharepoint.com/sites/YourSite"
                  value={formData.site_url}
                  onChange={(e) =>
                    setFormData({ ...formData, site_url: e.target.value })
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="folder_path"
                  className="block text-sm font-medium text-gray-700"
                >
                  Folder Path
                </label>
                <input
                  type="text"
                  id="folder_path"
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                  placeholder="Shared Documents/Docuflow"
                  value={formData.folder_path}
                  onChange={(e) =>
                    setFormData({ ...formData, folder_path: e.target.value })
                  }
                />
              </div>
            </>
          ) : null}

          {formData.provider === 'azure_blob' ? (
            <div>
              <label
                htmlFor="container_name"
                className="block text-sm font-medium text-gray-700"
              >
                Container Name *
              </label>
              <input
                type="text"
                id="container_name"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                placeholder="documents"
                value={formData.container_name}
                onChange={(e) =>
                  setFormData({ ...formData, container_name: e.target.value })
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                The Azure Blob Storage container name where documents will be stored
              </p>
            </div>
          ) : null}

          {formData.provider === 'supabase' ? (
            <div>
              <label
                htmlFor="folder_path"
                className="block text-sm font-medium text-gray-700"
              >
                Folder Path (Optional)
              </label>
              <input
                type="text"
                id="folder_path"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                placeholder="documents"
                value={formData.folder_path}
                onChange={(e) =>
                  setFormData({ ...formData, folder_path: e.target.value })
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                Optional folder path within the Supabase Storage bucket
              </p>
            </div>
          ) : null}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_default"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              checked={formData.is_default}
              onChange={(e) =>
                setFormData({ ...formData, is_default: e.target.checked })
              }
            />
            <label htmlFor="is_default" className="ml-2 text-sm text-gray-700">
              Set as default storage provider
            </label>
          </div>

          {(formData.provider === 'google_drive' || formData.provider === 'onedrive') && (
            <div className="rounded-md bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> After creating this configuration, you'll need to connect
                your {formData.provider === 'google_drive' ? 'Google' : 'Microsoft'} account via OAuth
                to enable document storage. The connection can be set up in the Integrations page.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-4">
            <Link
              href="/dashboard/storage"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <LoadingButton
              type="submit"
              loading={loading}
            >
              Create Configuration
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}

