'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

interface StorageActionButtonsProps {
  storageId: string;
  storageName: string;
  provider?: 'google_drive' | 'onedrive' | 'sharepoint' | 'azure_blob' | 'supabase';
  hasTokens?: boolean;
}

export function StorageActionButtons({ storageId, storageName, provider, hasTokens }: StorageActionButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const handleTest = async () => {
    setLoading('test');
    try {
      const res = await fetch(`/api/storage/${storageId}/test`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        const errorMsg = json.error || 'Test failed';
        toast.error(errorMsg);
        console.error('Storage test failed:', json);
        throw new Error(errorMsg);
      }
      if (json.ok) {
        toast.success('Connection successful!');
      } else {
        toast.error('Connection failed');
      }
    } catch (e: any) {
      console.error('Storage test error:', e);
      toast.error(e?.message || 'Test failed');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${storageName}? This action cannot be undone.`)) {
      return;
    }
    setLoading('delete');
    try {
      const res = await fetch(`/api/storage/${storageId}/delete`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        // Show migration error more prominently
        if (json.error && (json.error.includes('migration') || json.error.includes('policy'))) {
          toast.error(json.error, { duration: 10000 });
          console.error('Delete failed - Migration required:', json);
        } else {
          console.error('Delete storage config error:', json);
          toast.error(json.error || 'Failed to delete storage configuration');
        }
        setLoading(null);
        return;
      }
      toast.success('Storage configuration deleted successfully');
      // Refresh the page data without full reload
      router.refresh();
      // Small delay to ensure state updates
      setTimeout(() => {
        setLoading(null);
      }, 500);
    } catch (e: any) {
      console.error('Delete storage config failed:', e);
      toast.error(e?.message || 'Failed to delete storage configuration');
      setLoading(null);
    }
  };

  const handleReconnect = () => {
    if (provider === 'onedrive') {
      window.location.href = `/auth/onedrive?storage_id=${storageId}`;
    } else if (provider === 'google_drive') {
      window.location.href = `/auth/google?storage_id=${storageId}`;
    }
  };

  return (
    <div className="ml-4 flex gap-2">
      {/* Show Connect button for OAuth providers without tokens */}
      {provider === 'onedrive' && !hasTokens && (
        <Link
          href={`/auth/onedrive?storage_id=${storageId}`}
          className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
        >
          Connect
        </Link>
      )}
      {provider === 'google_drive' && !hasTokens && (
        <Link
          href={`/auth/google?storage_id=${storageId}`}
          className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
        >
          Connect
        </Link>
      )}
      
      {/* Show Reconnect button for OAuth providers with tokens (in case connection failed) */}
      {provider === 'onedrive' && hasTokens && (
        <button
          onClick={handleReconnect}
          disabled={!!loading}
          className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          Reconnect
        </button>
      )}
      {provider === 'google_drive' && hasTokens && (
        <button
          onClick={handleReconnect}
          disabled={!!loading}
          className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          Reconnect
        </button>
      )}
      
      <button
        onClick={handleTest}
        disabled={!!loading}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {loading === 'test' ? 'Testing...' : 'Test'}
      </button>
      <Link
        href={`/dashboard/storage/${storageId}/edit`}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Edit
      </Link>
      <button
        onClick={handleDelete}
        disabled={!!loading}
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {loading === 'delete' ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
}

