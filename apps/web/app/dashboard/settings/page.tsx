import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ValidationSettingsForm } from '@/components/validation-settings-form';
import { RoutingRulesSettings } from '@/components/routing-rules-settings';

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's profile and organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role, organizations(id, name, settings)')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    redirect('/dashboard/setup');
  }

  // Check if user is admin or owner (only they can access settings)
  if (profile.role !== 'owner' && profile.role !== 'admin') {
    redirect('/dashboard');
  }

  const organization = profile.organizations as any;
  const settings = organization?.settings || {};

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="mt-2 text-sm text-slate-600">
          Configure validation thresholds and routing rules for {organization?.name}
        </p>
      </div>

      <div className="space-y-6">
        {/* Validation Settings */}
        <ValidationSettingsForm 
          organizationId={profile.organization_id}
          initialSettings={settings.auto_approval || {}}
        />

        {/* Routing Rules Settings */}
        <RoutingRulesSettings organizationId={profile.organization_id} />
      </div>
    </div>
  );
}

