import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { EnhancedKpiCard } from '@/components/enhanced-kpi-card';
import { AreaSparkline } from '@/components/area-sparkline';
import { InsightsPanel } from '@/components/insights-panel';
import {
  calculateTrend,
  generateTimeSeriesData,
} from '@/lib/analytics';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Redirect to organization page if user doesn't have one
  if (!profile?.organization_id) {
    redirect('/dashboard/organization');
  }

  // Check if this is a new organization (no email or storage configured yet)
  const [{ data: emailAccounts }, { data: storageConfigs }] = await Promise.all([
    supabase
      .from('email_accounts')
      .select('id, provider, email, is_active, last_sync_at, expires_at')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true),
    supabase
      .from('storage_configs')
      .select('id, provider, name, is_active')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true),
  ]);

  const hasEmail = (emailAccounts?.length || 0) > 0;
  const hasStorage = (storageConfigs?.length || 0) > 0;
  const isNewOrg = !hasEmail && !hasStorage;

  // Check if user just created org (profile was updated recently)
  if (isNewOrg && profile.updated_at) {
    const updatedRecently = new Date(profile.updated_at).getTime() > Date.now() - 5 * 60 * 1000; // 5 minutes
    if (updatedRecently) {
      redirect('/dashboard/setup');
    }
  }

  // Analytics for dashboard
  const organizationId = profile.organization_id;
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const sevenDaysAgo = new Date(now.getTime() - sevenDaysMs);
  const thirtyDaysAgo = new Date(now.getTime() - thirtyDaysMs);
  const previousPeriodStart = new Date(thirtyDaysAgo.getTime() - thirtyDaysMs);
  const previousPeriodEnd = thirtyDaysAgo;

  // Enhanced data queries
  const [
    { count: totalRequests },
    { count: openRequests },
    { count: completedRequests },
    { count: overdueRequests },
    { data: allRequests },
    { data: previousPeriodRequests },
    { data: recentRequests },
    { data: upcomingDueRequests },
  ] = await Promise.all([
    supabase
      .from('document_requests')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId),
    supabase
      .from('document_requests')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'sent', 'missing_files']),
    supabase
      .from('document_requests')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('status', ['received', 'completed']),
    supabase
      .from('document_requests')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .lt('due_date', now.toISOString())
      .not('status', 'in', '(received,completed,expired)'),
    supabase
      .from('document_requests')
      .select('id, status, created_at, completed_at, sent_at, due_date')
      .eq('organization_id', organizationId),
    supabase
      .from('document_requests')
      .select('id, status, created_at, completed_at')
      .eq('organization_id', organizationId)
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', previousPeriodEnd.toISOString()),
    supabase
      .from('document_requests')
      .select('id, subject, status, created_at, due_date, recipient_email, sent_at, completed_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('document_requests')
      .select('id, subject, status, due_date, recipient_email')
      .eq('organization_id', organizationId)
      .gte('due_date', now.toISOString())
      .lte('due_date', new Date(now.getTime() + sevenDaysMs).toISOString())
      .in('status', ['pending', 'sent', 'missing_files'])
      .order('due_date', { ascending: true })
      .limit(5),
  ]);

  // Calculate analytics
  const timeSeriesData = generateTimeSeriesData(allRequests || [], 30, now);

  // Calculate trends
  const totalTrend = calculateTrend(totalRequests || 0, previousPeriodRequests?.length || 0);
  const openTrend = calculateTrend(
    openRequests || 0,
    previousPeriodRequests?.filter((r) => ['pending', 'sent', 'missing_files'].includes(r.status)).length || 0
  );
  const completedTrend = calculateTrend(
    completedRequests || 0,
    previousPeriodRequests?.filter((r) => ['received', 'completed'].includes(r.status)).length || 0
  );

  // Generate insights
  const insights = [];
  
  if (overdueRequests && overdueRequests > 0) {
    insights.push({
      id: 'overdue-requests',
      type: 'error' as const,
      title: `${overdueRequests} Overdue Request${overdueRequests > 1 ? 's' : ''}`,
      message: 'You have requests that are past their due date and need attention.',
      action: {
        label: 'View overdue requests',
        href: '/dashboard/requests?status=overdue',
      },
      priority: 10,
    });
  }

  if (upcomingDueRequests && upcomingDueRequests.length > 0) {
    insights.push({
      id: 'upcoming-due',
      type: 'warning' as const,
      title: `${upcomingDueRequests.length} Request${upcomingDueRequests.length > 1 ? 's' : ''} Due Soon`,
      message: `${upcomingDueRequests.length} request${upcomingDueRequests.length > 1 ? 's are' : ' is'} due in the next 7 days.`,
      action: {
        label: 'Review upcoming',
        href: '/dashboard/requests',
      },
      priority: 7,
    });
  }

  if (completedTrend.isPositive && completedTrend.changePercent > 10) {
    insights.push({
      id: 'completion-improvement',
      type: 'success' as const,
      title: 'Completion Rate Improved',
      message: `Your completion rate increased by ${Math.abs(completedTrend.changePercent)}% compared to the previous period.`,
      priority: 5,
    });
  }

  if (!hasEmail) {
    insights.push({
      id: 'no-email',
      type: 'warning' as const,
      title: 'No Email Integration',
      message: 'Connect an email account to enable automated document collection.',
      action: {
        label: 'Connect email',
        href: '/dashboard/integrations',
      },
      priority: 8,
    });
  }

  if (!hasStorage) {
    insights.push({
      id: 'no-storage',
      type: 'warning' as const,
      title: 'No Storage Configured',
      message: 'Configure a storage destination to save collected documents.',
      action: {
        label: 'Configure storage',
        href: '/dashboard/storage',
      },
      priority: 8,
    });
  }


  // 7-day sparkline for KPI card
  const last7Requests = allRequests?.filter(
    (r) => new Date(r.created_at).getTime() >= sevenDaysAgo.getTime()
  ) || [];
  const countsByDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    countsByDay[key] = 0;
  }
  last7Requests.forEach((r) => {
    const key = new Date(r.created_at).toISOString().slice(0, 10);
    if (countsByDay[key] !== undefined) countsByDay[key] += 1;
  });
  const sparklineValues = Object.values(countsByDay);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
        {/* Hero Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-2 text-lg text-slate-600">
            Welcome back, <span className="font-semibold text-slate-900">{profile?.full_name || user.email}</span>! Here's your activity overview.
          </p>
        </div>

        {/* Insights Panel */}
        {insights.length > 0 && (
          <div className="mb-8">
            <InsightsPanel
              insights={insights}
              timeSeriesData={timeSeriesData}
            />
          </div>
        )}

        {/* Enhanced KPI Cards */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Cards will animate in with staggered delays */}
          <EnhancedKpiCard
            label="Total Requests"
            value={totalRequests ?? 0}
            helper="All document requests"
            trend={totalTrend}
            href="/dashboard/requests"
            color="blue"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          >
            <div className="h-10">
              <AreaSparkline values={sparklineValues} />
            </div>
          </EnhancedKpiCard>
          <EnhancedKpiCard
            label="Open Requests"
            value={openRequests ?? 0}
            helper="Pending / Sent / Missing files"
            trend={openTrend}
            href="/dashboard/requests?status=open"
            color="yellow"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <EnhancedKpiCard
            label="Completed"
            value={completedRequests ?? 0}
            helper="Received or Completed"
            trend={completedTrend}
            href="/dashboard/requests?status=completed"
            color="green"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <EnhancedKpiCard
            label="Overdue"
            value={overdueRequests ?? 0}
            helper="Past due and not completed"
            href="/dashboard/requests?status=overdue"
            color="red"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          >
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
              (overdueRequests ?? 0) > 0
                ? 'bg-red-100 text-red-800'
                : 'bg-slate-100 text-slate-700'
            }`}>
              {(overdueRequests ?? 0) > 0 ? 'Action needed' : 'All good'}
            </span>
          </EnhancedKpiCard>
        </div>


        {/* Recent Requests & Upcoming Due */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Recent Requests</h3>
              <Link href="/dashboard/requests" className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700">
                View all →
              </Link>
            </div>
            {recentRequests && recentRequests.length > 0 ? (
              <ul className="divide-y divide-slate-200">
                {recentRequests.map((r) => (
                  <li key={r.id} className="py-3 transition-colors hover:bg-slate-50 rounded-lg px-2 -mx-2">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-slate-900">{r.subject}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                            (r.status === 'pending' && 'bg-yellow-100 text-yellow-800') ||
                            (r.status === 'sent' && 'bg-blue-100 text-blue-800') ||
                            ((r.status === 'received' || r.status === 'completed') && 'bg-green-100 text-green-800') ||
                            (r.status === 'missing_files' && 'bg-orange-100 text-orange-800') ||
                            (r.status === 'expired' && 'bg-red-100 text-red-800') ||
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {r.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-600">To: {r.recipient_email}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Created {formatRelativeTime(r.created_at)} {r.due_date ? `• Due ${formatDate(r.due_date)}` : ''}
                        </div>
                      </div>
                      <Link href="/dashboard/requests" className="ml-3 whitespace-nowrap text-sm font-medium text-blue-600 transition-colors hover:text-blue-700">
                        Open →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-500">No recent requests</div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Upcoming Due (7 days)</h3>
              <Link href="/dashboard/requests" className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700">
                Review →
              </Link>
            </div>
            {upcomingDueRequests && upcomingDueRequests.length > 0 ? (
              <ul className="divide-y divide-slate-200">
                {upcomingDueRequests.map((r) => (
                  <li key={r.id} className="py-3 transition-colors hover:bg-slate-50 rounded-lg px-2 -mx-2">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-slate-900">{r.subject}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                            (r.status === 'pending' && 'bg-yellow-100 text-yellow-800') ||
                            (r.status === 'sent' && 'bg-blue-100 text-blue-800') ||
                            (r.status === 'missing_files' && 'bg-orange-100 text-orange-800') ||
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {r.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-600">To: {r.recipient_email}</div>
                        <div className="mt-1 text-xs text-slate-500">Due {r.due_date ? formatDate(r.due_date) : '—'}</div>
                      </div>
                      <Link href="/dashboard/requests" className="ml-3 whitespace-nowrap text-sm font-medium text-blue-600 transition-colors hover:text-blue-700">
                        Nudge →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-500">No items due in the next week</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
