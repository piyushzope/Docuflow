'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

interface RequestHistory {
  id: string;
  subject: string;
  status: string;
  request_type: string | null;
  created_at: string;
  due_date: string | null;
}

interface RecipientHistoryProps {
  recipientEmail: string;
  onCloneRequest?: (request: RequestHistory) => void;
  className?: string;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  received: 'bg-green-100 text-green-800',
  missing_files: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
};

export default function RecipientHistory({
  recipientEmail,
  onCloneRequest,
  className = '',
}: RecipientHistoryProps) {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const supabase = createClient();

  useEffect(() => {
    if (!recipientEmail || !EMAIL_REGEX.test(recipientEmail)) {
      setHistory([]);
      return;
    }

    async function loadHistory() {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!profile?.organization_id) return;

        // Build query
        let query = supabase
          .from('document_requests')
          .select('id, subject, status, request_type, created_at, due_date')
          .eq('organization_id', profile.organization_id)
          .eq('recipient_email', recipientEmail.toLowerCase())
          .order('created_at', { ascending: false })
          .limit(20);

        // Apply status filter
        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        const { data: historyData, error: historyError } = await query;

        if (historyError) throw historyError;

        setHistory((historyData || []) as RequestHistory[]);
      } catch (err: any) {
        console.error('Error loading recipient history:', err);
        setError(err.message || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    }

    // Debounce API call
    const timeoutId = setTimeout(loadHistory, 300);
    return () => clearTimeout(timeoutId);
  }, [recipientEmail, statusFilter, supabase]);

  if (!recipientEmail || !EMAIL_REGEX.test(recipientEmail)) {
    return null;
  }

  return (
    <div className={`rounded-lg border border-gray-200 bg-white ${className}`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Previous Requests</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {history.length} {history.length === 1 ? 'request' : 'requests'} found
          </p>
        </div>
        {history.length > 0 && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-md border border-gray-300 bg-white px-2 py-1 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="received">Received</option>
            <option value="missing_files">Missing Files</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
          </select>
        )}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-sm text-gray-500">Loading history...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : history.length === 0 ? (
          <div className="text-sm text-gray-500">
            No previous requests found for this recipient
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {history.map((request) => (
              <div
                key={request.id}
                className="flex items-start justify-between p-3 rounded-md border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusColors[request.status as keyof typeof statusColors] ||
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {request.status}
                    </span>
                    {request.request_type && (
                      <span className="text-xs text-gray-500">{request.request_type}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{request.subject}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(request.created_at), 'MMM d, yyyy')}
                    {request.due_date && (
                      <span className="ml-2">
                        • Due: {format(new Date(request.due_date), 'MMM d, yyyy')}
                      </span>
                    )}
                  </p>
                </div>
                {onCloneRequest && (
                  <button
                    type="button"
                    onClick={() => onCloneRequest(request)}
                    className="ml-2 text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
                    title="Clone this request"
                  >
                    Clone
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

