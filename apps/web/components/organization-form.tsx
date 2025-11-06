'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LoadingButton } from '@/components/loading-button';

export function OrganizationForm({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
  });

  const [joinForm, setJoinForm] = useState({
    slug: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Generate slug from name if not provided
      const slug = createForm.slug || createForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: createForm.name,
          slug,
        })
        .select()
        .single();

      if (orgError) {
        if (orgError.code === '23505') {
          throw new Error('An organization with this name or slug already exists');
        }
        throw orgError;
      }

      // Try updating profile directly first
      let profileError = null;
      let updatedProfile = null;

      // Attempt 1: Direct update
      const updateResult = await supabase
        .from('profiles')
        .update({
          organization_id: org.id,
          role: 'owner',
        })
        .eq('id', userId)
        .select()
        .single();

      profileError = updateResult.error;
      updatedProfile = updateResult.data;

      // Attempt 2: If update failed, try using API endpoint
      if (profileError || !updatedProfile?.organization_id) {
        console.log('Direct update failed, trying API endpoint...');
        const apiResponse = await fetch('/api/organization/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationId: org.id }),
        });

        if (!apiResponse.ok) {
          const errorData = await apiResponse.json();
          throw new Error(errorData.error || 'Failed to link organization');
        }

        const result = await apiResponse.json();
        if (!result.success) {
          throw new Error('Failed to link organization via API');
        }
      }

      // Show success message briefly, then redirect
      setLoading(false);
      setError(null);
      setSuccess('Organization created successfully! Redirecting...');
      
      // Force a hard navigation to ensure the redirect works
      setTimeout(() => {
        window.location.href = '/dashboard/setup';
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to create organization');
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Find organization by slug
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', joinForm.slug)
        .single();

      if (orgError || !org) {
        throw new Error('Organization not found. Please check the slug.');
      }

      // Try updating profile directly first
      let profileError = null;
      let updatedProfile = null;

      // Attempt 1: Direct update
      const updateResult = await supabase
        .from('profiles')
        .update({
          organization_id: org.id,
          role: 'member',
        })
        .eq('id', userId)
        .select()
        .single();

      profileError = updateResult.error;
      updatedProfile = updateResult.data;

      // Attempt 2: If update failed, try using API endpoint
      if (profileError || !updatedProfile?.organization_id) {
        console.log('Direct update failed, trying API endpoint...');
        const apiResponse = await fetch('/api/organization/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationId: org.id }),
        });

        if (!apiResponse.ok) {
          const errorData = await apiResponse.json();
          throw new Error(errorData.error || 'Failed to link organization');
        }

        const result = await apiResponse.json();
        if (!result.success) {
          throw new Error('Failed to link organization via API');
        }
      }

      // Show success, then redirect
      setLoading(false);
      setError(null);
      setSuccess('Successfully joined organization! Redirecting...');
      
      // Force a hard navigation to ensure the redirect works
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to join organization');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex rounded-lg border border-gray-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setMode('create')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'create'
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Create Organization
        </button>
        <button
          type="button"
          onClick={() => setMode('join')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'join'
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Join Organization
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {mode === 'create' ? (
        <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Create New Organization</h3>
          <p className="mt-2 text-sm text-gray-600">
            Create a new organization to start managing document collection
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Organization Name *
              </label>
              <input
                type="text"
                id="name"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                placeholder="My Company"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
              />
            </div>

            <div>
              <label
                htmlFor="slug"
                className="block text-sm font-medium text-gray-700"
              >
                URL Slug
              </label>
              <input
                type="text"
                id="slug"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                placeholder="my-company (auto-generated from name)"
                value={createForm.slug}
                onChange={(e) =>
                  setCreateForm({ ...createForm, slug: e.target.value })
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                A unique identifier for your organization. Leave blank to auto-generate from name.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <LoadingButton
              type="submit"
              loading={loading}
              className="w-full"
            >
              Create Organization
            </LoadingButton>
          </div>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Join Existing Organization</h3>
          <p className="mt-2 text-sm text-gray-600">
            Enter the organization slug provided by your administrator
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="join-slug"
                className="block text-sm font-medium text-gray-700"
              >
                Organization Slug *
              </label>
              <input
                type="text"
                id="join-slug"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                placeholder="my-company"
                value={joinForm.slug}
                onChange={(e) =>
                  setJoinForm({ ...joinForm, slug: e.target.value })
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                Ask your organization administrator for the slug
              </p>
            </div>
          </div>

          <div className="mt-6">
            <LoadingButton
              type="submit"
              loading={loading}
              className="w-full"
            >
              Join Organization
            </LoadingButton>
          </div>
        </form>
      )}
    </div>
  );
}
