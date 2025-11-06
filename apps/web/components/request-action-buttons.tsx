'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface RequestActionButtonsProps {
  requestId: string;
  status: string;
}

export function RequestActionButtons({ requestId, status }: RequestActionButtonsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      // Check session before making the request - use getUser() to force refresh
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Session check failed:', userError);
        toast.error('Your session has expired. Please log in again.');
        // Clear any stale session data
        await supabase.auth.signOut();
        router.push('/login');
        setSending(false);
        return;
      }

      const formData = new FormData();
      formData.append('requestId', requestId);

      const response = await fetch('/api/send-request', {
        method: 'POST',
        headers: {
          'Accept': 'application/json', // Tell server we want JSON response
        },
        credentials: 'include', // Ensure cookies are sent with the request
        body: formData,
      });

      // Handle non-OK responses
      if (!response.ok) {
        // Try to parse JSON error response
        let data;
        try {
          const text = await response.text();
          console.error('API Error Response:', text);
          data = JSON.parse(text);
        } catch (parseError) {
          // If response is not JSON, treat 401 as session expired
          if (response.status === 401) {
            toast.error('Your session has expired. Please log in again.');
            // Clear any stale session data
            await supabase.auth.signOut();
            router.push('/login');
            setSending(false);
            return;
          }
          throw new Error(`Request failed with status ${response.status}`);
        }

        // Check for session expiration errors (any status code with JWT/auth errors)
        const errorMessage = String(data.error || '').toLowerCase();
        const errorCode = String(data.code || '').toLowerCase();
        const isJwtError = 
          response.status === 401 || 
          errorCode === 'session_expired' ||
          errorMessage.includes('jwt') ||
          errorMessage.includes('idx14100') ||
          errorMessage.includes('well formed') ||
          errorMessage.includes('session expired') ||
          errorMessage.includes('authentication') ||
          errorMessage.includes('token');
        
        if (isJwtError) {
          toast.error('Your session has expired. Please log in again.');
          // Clear any stale session data
          await supabase.auth.signOut();
          router.push('/login');
          setSending(false);
          return;
        }
        
        console.error('Send request error:', data);
        // Show detailed error message if available
        const detailedErrorMessage = data.details || data.error || 'Failed to send request';
        throw new Error(detailedErrorMessage);
      }

      // Parse JSON response for successful requests
      const data = await response.json();

      // Success - navigate to redirect URL and refresh to show updated status
      if (data.success && data.redirectUrl) {
        toast.success('Request sent successfully');
        // Navigate to the redirect URL (includes success query param)
        router.push(data.redirectUrl);
        // Force refresh to get updated data from server
        router.refresh();
      } else {
        toast.success('Request sent successfully');
        // Refresh current page to show updated status
        router.refresh();
      }
    } catch (error: any) {
      console.error('Send request failed:', error);
      
      // Check if it's a JWT/auth error
      const errorMessage = String(error.message || '').toLowerCase();
      const isAuthError = 
        errorMessage.includes('jwt') ||
        errorMessage.includes('idx14100') ||
        errorMessage.includes('session') ||
        errorMessage.includes('expired') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('authentication');
      
      if (isAuthError) {
        toast.error('Your session has expired. Please log in again.');
        // Clear any stale session data
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
      } else {
        toast.error(error.message || 'Failed to send request');
      }
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/requests/${requestId}/delete`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        // Show migration error more prominently
        if (data.error && (data.error.includes('migration') || data.error.includes('policy'))) {
          toast.error(data.error, { duration: 10000 });
          console.error('Delete failed - Migration required:', data);
          throw new Error(data.error);
        }
        console.error('Delete request error:', data);
        throw new Error(data.error || 'Failed to delete request');
      }

      toast.success('Request deleted successfully');
      router.refresh();
    } catch (error: any) {
      console.error('Delete request failed:', error);
      toast.error(error.message || 'Failed to delete request');
      setDeleting(false);
    }
  };

  return (
    <div className="flex gap-2">
      {status === 'pending' && (
        <button
          onClick={handleSend}
          disabled={sending}
          className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      )}
      {(status === 'pending' || status === 'sent') && (
        <form action="/api/notifications/send-reminder" method="post" className="inline">
          <input type="hidden" name="requestId" value={requestId} />
          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Remind
          </button>
        </form>
      )}
      <Link
        href={`/dashboard/requests/${requestId}/edit`}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        Edit
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
      >
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
}

