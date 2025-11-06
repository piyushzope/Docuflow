'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { LoadingButton } from '@/components/loading-button';

export default function NewRulePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    priority: 0,
    sender_pattern: '',
    subject_pattern: '',
    file_types: '',
    storage_id: '',
    folder_path: '',
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

      // Get storage configs for dropdown
      const { data: storageConfigs } = await supabase
        .from('storage_configs')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .limit(1);

      const defaultStorageId = storageConfigs?.[0]?.id || '';

      // Build conditions
      const conditions: any = {};
      if (formData.sender_pattern) {
        conditions.sender_pattern = formData.sender_pattern;
      }
      if (formData.subject_pattern) {
        conditions.subject_pattern = formData.subject_pattern;
      }
      if (formData.file_types) {
        conditions.file_types = formData.file_types
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t);
      }

      // Build actions
      const actions = {
        storage_id: formData.storage_id || defaultStorageId,
        folder_path: formData.folder_path || 'documents/{date}',
      };

      // Create routing rule
      const { error: insertError } = await supabase
        .from('routing_rules')
        .insert({
          organization_id: profile.organization_id,
          name: formData.name,
          priority: formData.priority,
          conditions,
          actions,
          is_active: true,
        });

      if (insertError) {
        throw insertError;
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        organization_id: profile.organization_id,
        user_id: user.id,
        action: 'create',
        resource_type: 'routing_rule',
        details: {
          name: formData.name,
        },
      });

      router.push('/dashboard/rules');
    } catch (err: any) {
      setError(err.message || 'Failed to create rule');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">New Routing Rule</h1>
            <Link
              href="/dashboard/rules"
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
              Rule Name *
            </label>
            <input
              type="text"
              id="name"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="priority"
                className="block text-sm font-medium text-gray-700"
              >
                Priority
              </label>
              <input
                type="number"
                id="priority"
                min="0"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                Higher priority rules are evaluated first
              </p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900">Conditions</h3>
            <p className="mt-1 text-sm text-gray-600">
              All conditions must match for this rule to apply
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="sender_pattern"
                  className="block text-sm font-medium text-gray-700"
                >
                  Sender Email Pattern (Regex)
                </label>
                <input
                  type="text"
                  id="sender_pattern"
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                  placeholder="e.g., .*@example\\.com"
                  value={formData.sender_pattern}
                  onChange={(e) =>
                    setFormData({ ...formData, sender_pattern: e.target.value })
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="subject_pattern"
                  className="block text-sm font-medium text-gray-700"
                >
                  Subject Pattern (Regex)
                </label>
                <input
                  type="text"
                  id="subject_pattern"
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                  placeholder="e.g., .*Document.*"
                  value={formData.subject_pattern}
                  onChange={(e) =>
                    setFormData({ ...formData, subject_pattern: e.target.value })
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="file_types"
                  className="block text-sm font-medium text-gray-700"
                >
                  File Types (comma-separated)
                </label>
                <input
                  type="text"
                  id="file_types"
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                  placeholder="e.g., pdf, doc, docx"
                  value={formData.file_types}
                  onChange={(e) =>
                    setFormData({ ...formData, file_types: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900">Actions</h3>

            <div className="mt-4 space-y-4">
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
                  placeholder="e.g., documents/{sender_email}/{date}"
                  value={formData.folder_path}
                  onChange={(e) =>
                    setFormData({ ...formData, folder_path: e.target.value })
                  }
                />
                <p className="mt-1 text-xs text-gray-500">
                  Available placeholders: {'{sender_email}'}, {'{sender_name}'}, {'{employee_email}'}, {'{employee_name}'}, {'{date}'}, {'{year}'}, {'{month}'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  <strong>Note:</strong> {'{employee_email}'} and {'{employee_name}'} match documents from employees in your organization. Falls back to sender info if not found.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Link
              href="/dashboard/rules"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <LoadingButton
              type="submit"
              loading={loading}
            >
              Create Rule
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}
