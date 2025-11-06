'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function EditRequestPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    recipient_email: '',
    subject: '',
    message_body: '',
    request_type: '',
    due_date: '',
    status: 'pending' as 'pending' | 'sent' | 'received' | 'missing_files' | 'completed' | 'expired',
  });

  useEffect(() => {
    async function loadRequest() {
      try {
        const resolved = await Promise.resolve(params);
        const id = resolved.id;
        setRequestId(id);

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

        // Fetch the request
        const { data: request, error: fetchError } = await supabase
          .from('document_requests')
          .select('*')
          .eq('id', id)
          .eq('organization_id', profile.organization_id)
          .single();

        if (fetchError || !request) {
          setError('Request not found');
          setLoading(false);
          return;
        }

        setFormData({
          recipient_email: request.recipient_email || '',
          subject: request.subject || '',
          message_body: request.message_body || '',
          request_type: request.request_type || '',
          due_date: request.due_date ? new Date(request.due_date).toISOString().split('T')[0] : '',
          status: request.status || 'pending',
        });

        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load request');
        setLoading(false);
      }
    }

    loadRequest();
  }, [params, router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/requests/${requestId}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: formData.recipient_email,
          subject: formData.subject,
          message_body: formData.message_body,
          request_type: formData.request_type || null,
          due_date: formData.due_date || null,
          status: formData.status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update request');
      }

      toast.success('Request updated successfully');
      router.push('/dashboard/requests');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update request');
      toast.error(err.message || 'Failed to update request');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-sm text-gray-600">Loading request...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Edit Document Request</h1>
            <Link
              href="/dashboard/requests"
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
              htmlFor="recipient_email"
              className="block text-sm font-medium text-gray-700"
            >
              Recipient Email *
            </label>
            <input
              type="email"
              id="recipient_email"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              value={formData.recipient_email}
              onChange={(e) =>
                setFormData({ ...formData, recipient_email: e.target.value })
              }
            />
          </div>

          <div>
            <label
              htmlFor="subject"
              className="block text-sm font-medium text-gray-700"
            >
              Subject *
            </label>
            <input
              type="text"
              id="subject"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
            />
          </div>

          <div>
            <label
              htmlFor="message_body"
              className="block text-sm font-medium text-gray-700"
            >
              Message Body
            </label>
            <textarea
              id="message_body"
              rows={6}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              value={formData.message_body}
              onChange={(e) =>
                setFormData({ ...formData, message_body: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="request_type"
                className="block text-sm font-medium text-gray-700"
              >
                Request Type
              </label>
              <input
                type="text"
                id="request_type"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., ID Verification"
                value={formData.request_type}
                onChange={(e) =>
                  setFormData({ ...formData, request_type: e.target.value })
                }
              />
            </div>

            <div>
              <label
                htmlFor="due_date"
                className="block text-sm font-medium text-gray-700"
              >
                Due Date
              </label>
              <input
                type="date"
                id="due_date"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <select
              id="status"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as any })
              }
            >
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="received">Received</option>
              <option value="missing_files">Missing Files</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="flex justify-end gap-4">
            <Link
              href="/dashboard/requests"
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

