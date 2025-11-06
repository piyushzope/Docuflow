'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type StorageProvider = 'google_drive' | 'onedrive' | 'sharepoint' | 'azure_blob' | 'supabase';

export default function EditStoragePage() {
  const router = useRouter();
  const params = useParams();
  const storageId = params.id as string;
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    is_default: false,
    is_active: true,
    folder_path: '',
    container_name: '',
    site_url: '',
    provider: '' as StorageProvider | '',
  });

  useEffect(() => {
    async function loadStorageConfig() {
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

        const profileData = profile as any;
        if (!profileData?.organization_id) {
          setError('No organization found');
          setLoading(false);
          return;
        }

        // Fetch storage config
        const { data: storageConfig, error: fetchError } = await supabase
          .from('storage_configs')
          .select('*')
          .eq('id', storageId)
          .eq('organization_id', profileData.organization_id)
          .single();

        if (fetchError || !storageConfig) {
          setError('Storage configuration not found');
          setLoading(false);
          return;
        }

        const storage = storageConfig as any;
        const config = storage.config || {};
        setFormData({
          name: storage.name,
          is_default: storage.is_default || false,
          is_active: storage.is_active ?? true,
          provider: storage.provider,
          folder_path: (config.folder_path as string) || '',
          container_name: (config.container_name as string) || '',
          site_url: (config.site_url as string) || '',
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load storage configuration');
      } finally {
        setLoading(false);
      }
    }

    if (storageId) {
      loadStorageConfig();
    }
  }, [storageId, router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
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

      const profileData = profile as any;
      if (!profileData?.organization_id) {
        setError('Please create or join an organization first');
        setSaving(false);
        return;
      }

      if (!formData.name) {
        setError('Please fill in all required fields');
        setSaving(false);
        return;
      }

      // Build config object based on provider
      let config: Record<string, unknown> = {};
      
      // Get existing config to preserve tokens
      const { data: existingData } = await supabase
        .from('storage_configs')
        .select('config')
        .eq('id', storageId)
        .single();
      
      const existingRecord = existingData as any;
      const existingConfig = (existingRecord?.config as Record<string, unknown>) || {};
      
      if (formData.provider === 'azure_blob') {
        config = {
          ...existingConfig,
          container_name: formData.container_name,
        };
      } else if (formData.provider === 'sharepoint') {
        config = {
          ...existingConfig,
          site_url: formData.site_url,
          folder_path: formData.folder_path || 'Documents',
        };
      } else if (formData.provider === 'google_drive' || formData.provider === 'onedrive') {
        config = {
          ...existingConfig,
          folder_path: formData.folder_path || 'Documents',
        };
      } else if (formData.provider === 'supabase') {
        config = {
          ...existingConfig,
          bucket: existingConfig.bucket || 'documents',
          folder_path: formData.folder_path || '',
        };
      } else {
        config = existingConfig;
      }

      // Check if this should be the default storage
      let isDefault = formData.is_default;
      if (isDefault) {
        // If setting as default, unset other defaults
        await supabase
          .from('storage_configs')
          .update({ is_default: false } as any)
          .eq('organization_id', profileData.organization_id)
          .eq('is_default', true)
          .neq('id', storageId);
      }

      // Update storage config
      const { error: updateError } = await supabase
        .from('storage_configs')
        .update({
          name: formData.name,
          config: config,
          is_default: isDefault,
          is_active: formData.is_active,
        } as any)
        .eq('id', storageId)
        .eq('organization_id', profileData.organization_id);

      if (updateError) {
        throw updateError;
      }

      router.push('/dashboard/storage');
    } catch (err: any) {
      setError(err.message || 'Failed to update storage configuration');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Edit Storage Provider</h1>
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
              placeholder="e.g., Main OneDrive"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="text-sm text-gray-600">
            Provider: <span className="font-medium capitalize">{formData.provider}</span>
          </div>

          {/* Provider-specific fields */}
          {(formData.provider === 'google_drive' || formData.provider === 'onedrive') && (
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
            </div>
          )}

          {formData.provider === 'sharepoint' && (
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
          )}

          {formData.provider === 'azure_blob' && (
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
            </div>
          )}

          {formData.provider === 'supabase' && (
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
            </div>
          )}

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

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-4">
            <Link
              href="/dashboard/storage"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

