import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { CompletionRateChart } from '@/components/charts/completion-rate-chart';
import { ActivityHeatmap } from '@/components/charts/activity-heatmap';
import { PerformanceMetricsWidget } from '@/components/widgets/performance-metrics';
import {
  calculateCompletionRateOverTime,
  calculatePerformanceMetrics,
  groupActivityByDay,
} from '@/lib/analytics';

export default async function ActivityPage() {
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

  // Get data for charts and activity logs
  const [
    { data: activities },
    { data: requests },
    { data: documents },
  ] = await Promise.all([
    supabase
      .from('activity_logs')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('document_requests')
      .select('id, status, created_at, completed_at, sent_at, due_date')
      .eq('organization_id', profile.organization_id),
    supabase
      .from('documents')
      .select('id, created_at, document_request_id')
      .eq('organization_id', profile.organization_id),
  ]);

  // Calculate analytics
  const completionRateData = calculateCompletionRateOverTime(requests || [], 30);
  const activityHeatmapData = groupActivityByDay(activities || []);
  const performanceMetrics = calculatePerformanceMetrics(
    requests?.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      completed_at: r.completed_at,
      sent_at: r.sent_at,
      status: r.status,
      due_date: r.due_date,
    })) || [],
    documents?.map((d) => ({
      created_at: d.created_at || new Date().toISOString(),
      document_request_id: d.document_request_id,
    })) || []
  );

  const actionColors: Record<string, string> = {
    create: 'text-blue-600',
    update: 'text-yellow-600',
    delete: 'text-red-600',
    upload: 'text-green-600',
    download: 'text-purple-600',
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Activity Logs</h1>
          <p className="mt-2 text-sm text-slate-600">
            View audit trail and activity history
          </p>
        </div>
        {/* Charts Section */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Completion Rate</h3>
            <CompletionRateChart data={completionRateData} />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Activity Heatmap</h3>
            <ActivityHeatmap data={activityHeatmapData} />
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mb-8">
          <PerformanceMetricsWidget metrics={performanceMetrics} />
        </div>

        {activities && activities.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {activities.map((activity) => (
                  <tr key={activity.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(activity.created_at).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`font-medium ${
                          actionColors[activity.action.toLowerCase()] ||
                          'text-gray-900'
                        }`}
                      >
                        {activity.action}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {activity.resource_type}
                      {activity.resource_id && (
                        <span className="ml-2 text-xs text-gray-400">
                          ({activity.resource_id.substring(0, 8)}...)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {Object.keys(activity.details as object).length > 0 ? (
                        <details className="cursor-pointer">
                          <summary className="text-blue-600 hover:text-blue-800">
                            View details
                          </summary>
                          <pre className="mt-2 whitespace-pre-wrap text-xs">
                            {JSON.stringify(activity.details, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-gray-400">No details</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              No activity logs yet
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Activity will appear here as you use the system
            </p>
          </div>
        )}
      </div>
    </>
  );
}
