import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { RequestActionButtons } from '@/components/request-action-buttons';
import { EmptyState } from '@/components/empty-state';
import { QueryParamToast } from '@/components/query-param-toast';
import { formatDate } from '@/lib/utils';
import { TrendLineChart } from '@/components/charts/trend-line-chart';
import { generateTimeSeriesData } from '@/lib/analytics';

// Force dynamic rendering to ensure fresh data after status updates
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; count?: string }>;
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

  if (!profile?.organization_id) {
    redirect('/dashboard/organization');
  }

  // Get document requests for this organization
  const { data: requests } = await supabase
    .from('document_requests')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false });

  // Calculate request volume data for chart
  const now = new Date();
  const timeSeriesData = generateTimeSeriesData(requests || [], 30, now);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    sent: 'bg-blue-100 text-blue-800',
    received: 'bg-green-100 text-green-800',
    missing_files: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
  };

  return (
    <>
      <QueryParamToast />
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Document Requests</h1>
            <p className="mt-2 text-sm text-slate-600">
              Create and track document collection requests
            </p>
          </div>
          <Link
            href="/dashboard/requests/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            New Request
          </Link>
        </div>

        {params.error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{params.error}</p>
          </div>
        )}

        {params.success && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4">
            <p className="text-sm text-green-800">
              {params.success === 'sent' && 'Request sent successfully!'}
              {params.success === 'reminder_sent' && 'Reminder sent successfully!'}
              {params.success === 'created' && 'Request created successfully!'}
              {params.success === 'bulk_created' &&
                `Successfully created ${params.count || 'multiple'} request${(params.count && parseInt(params.count) > 1) ? 's' : ''}!`}
            </p>
          </div>
        )}

        {/* Request Volume Chart */}
        {requests && requests.length > 0 && (
          <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Request Volume (30 Days)</h3>
            <TrendLineChart data={timeSeriesData} />
          </div>
        )}

        {requests && requests.length > 0 ? (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {request.subject}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                          statusColors[request.status] || 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {request.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      To: {request.recipient_email}
                    </p>
                    {request.message_body && (
                      <p className="mt-2 text-sm text-slate-700">
                        {request.message_body.substring(0, 200)}
                        {request.message_body.length > 200 ? '...' : ''}
                      </p>
                    )}
                    <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                      <span>
                        Created:{' '}
                        {formatDate(request.created_at)}
                      </span>
                      {request.due_date && (
                        <span>
                          Due: {formatDate(request.due_date)}
                        </span>
                      )}
                      {request.sent_at && (
                        <span>
                          Sent: {formatDate(request.sent_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <RequestActionButtons requestId={request.id} status={request.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No document requests yet"
            description="Get started by creating your first document request"
            actionLabel="Create Request"
            actionHref="/dashboard/requests/new"
          />
        )}
      </div>
    </>
  );
}
