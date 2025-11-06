import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { OrganizationForm } from '@/components/organization-form';
import { LinkOrganizationButton } from '@/components/link-organization-button';

export default async function OrganizationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, organizations(*)')
    .eq('id', user.id)
    .single();

  // If user just got an organization, redirect to setup/dashboard
  if (profile?.organization_id) {
    // Check if this is a new organization (recently created)
    const { data: emailAccounts } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .limit(1);

    const { data: storageConfigs } = await supabase
      .from('storage_configs')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .limit(1);

    const hasEmail = (emailAccounts?.length || 0) > 0;
    const hasStorage = (storageConfigs?.length || 0) > 0;
    const isNewOrg = !hasEmail && !hasStorage;

    // If new org, redirect to setup. Otherwise show org info
    if (isNewOrg && profile.organizations) {
      redirect('/dashboard/setup');
    }
  }

  // If user already has an organization and setup is complete, show it
  if (profile?.organization_id && profile.organizations) {
    const org = profile.organizations as any;
    return (
      <>
        <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Organization</h1>
            <p className="mt-2 text-sm text-slate-600">
              You're a member of {org.name}
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">{org.name}</h2>
            <p className="mt-2 text-sm text-gray-600">
              Organization slug: <code className="rounded bg-gray-100 px-1">{org.slug}</code>
            </p>
            <p className="mt-4 text-sm text-slate-600">
              Created: {new Date(org.created_at).toLocaleDateString()}
            </p>
          </div>
          </div>
        </div>
      </>
    );
  }

  // Check if user has an organization they created but profile isn't linked
  // This can happen if the profile update failed
  const { data: orphanedOrgs } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  // User needs to create or join an organization
  return (
    <>
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Create or Join Organization</h1>
          <p className="mt-2 text-sm text-slate-600">
            Get started by creating a new organization or joining an existing one
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
        {/* If you have an organization but profile isn't linked, show link button */}
        {orphanedOrgs && orphanedOrgs.length > 0 && (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="mb-3 text-sm font-medium text-yellow-800">
              Found an existing organization: <strong>{orphanedOrgs[0].name}</strong>
            </p>
            <LinkOrganizationButton 
              organizationId={orphanedOrgs[0].id} 
              organizationName={orphanedOrgs[0].name}
            />
          </div>
        )}

          <OrganizationForm userId={user.id} />
        </div>
      </div>
    </>
  );
}
