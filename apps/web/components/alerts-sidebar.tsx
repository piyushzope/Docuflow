import { createClient } from '@/lib/supabase/server';
import { AlertsDropdown } from '@/components/alerts-dropdown';

export async function AlertsButton() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get user's organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  const organizationId = (profile as any)?.organization_id;
  if (!organizationId) {
    return null;
  }
  const now = new Date();

  // Get data needed for alerts
  const [
    { count: overdueRequests },
    { data: allEmailAccountsFull },
  ] = await Promise.all([
    supabase
      .from('document_requests')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .lt('due_date', now.toISOString())
      .not('status', 'in', '(received,completed,expired)'),
    supabase
      .from('email_accounts')
      .select('id, provider, email, is_active, last_sync_at, expires_at')
      .eq('organization_id', organizationId),
  ]);

  // Generate alerts
  const alerts = [];
  
  if (overdueRequests && overdueRequests > 0) {
    alerts.push({
      id: 'overdue-alert',
      type: 'error' as const,
      title: 'Overdue Requests',
      message: `${overdueRequests} request${overdueRequests > 1 ? 's are' : ' is'} past due date.`,
      action: {
        label: 'Take action',
        href: '/dashboard/requests?status=overdue',
      },
    });
  }

  // Check email account health
  (allEmailAccountsFull || []).forEach((account: any) => {
    if (account.is_active && account.expires_at) {
      const expiresAt = new Date(account.expires_at);
      const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilExpiry < 24) {
        alerts.push({
          id: `email-token-expiring-${account.id}`,
          type: 'warning' as const,
          title: 'Token Expiring Soon',
          message: `${account.email} token expires in ${Math.round(hoursUntilExpiry)} hours.`,
          action: {
            label: 'Refresh token',
            href: '/dashboard/integrations',
          },
        });
      }
    }
  });

  return <AlertsDropdown alerts={alerts} />;
}

