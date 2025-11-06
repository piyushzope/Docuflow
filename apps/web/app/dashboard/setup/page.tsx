import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function SetupPage() {
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
    .select('organization_id, organizations(*)')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    redirect('/dashboard/organization');
  }

  const org = profile.organizations as any;

  // Check setup progress
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

  const emailConnected = (emailAccounts?.length || 0) > 0;
  const storageConfigured = (storageConfigs?.length || 0) > 0;
  const setupComplete = emailConnected && storageConfigured;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-8 sm:px-8 lg:px-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Getting Started</h1>
            <p className="mt-2 text-sm text-slate-600">
              Set up your organization to start collecting documents
            </p>
          </div>
          {setupComplete && (
            <Link
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Go to Dashboard →
            </Link>
          )}
        </div>
        {/* Organization Created Success */}
        <div className="mb-8 rounded-xl border border-green-200 bg-green-50 p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-semibold text-green-900">
                Organization Created Successfully!
              </h3>
              <p className="mt-1 text-sm text-green-700">
                Your organization <strong>{org.name}</strong> is ready. Complete the setup steps below to start collecting documents.
              </p>
            </div>
          </div>
        </div>

        {/* Setup Steps */}
        <div className="space-y-4">
          {/* Step 1: Connect Email */}
          <div className={`rounded-xl border-2 p-6 transition-all duration-200 ${emailConnected ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-white shadow-sm'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  {emailConnected ? (
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                      1
                    </span>
                  )}
                  <h3 className={`ml-3 text-lg font-semibold ${emailConnected ? 'text-green-900' : 'text-slate-900'}`}>
                    Connect Email Account
                  </h3>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Connect your Gmail or Outlook account to enable automatic document collection from emails.
                </p>
                {!emailConnected && (
                  <Link
                    href="/dashboard/integrations"
                    className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    Connect Email →
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Configure Storage */}
          <div className={`rounded-xl border-2 p-6 transition-all duration-200 ${storageConfigured ? 'border-green-200 bg-green-50' : emailConnected ? 'border-blue-200 bg-white shadow-sm' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  {storageConfigured ? (
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${emailConnected ? 'bg-blue-600 text-white' : 'bg-slate-400 text-white'}`}>
                      2
                    </span>
                  )}
                  <h3 className={`ml-3 text-lg font-semibold ${storageConfigured ? 'text-green-900' : 'text-slate-900'}`}>
                    Configure Storage
                  </h3>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Set up where documents should be stored (Google Drive, OneDrive, SharePoint, or Supabase Storage).
                </p>
                {!storageConfigured && (
                  emailConnected ? (
                    <Link
                      href="/dashboard/storage"
                      className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      Configure Storage →
                    </Link>
                  ) : (
                    <span className="mt-4 inline-block rounded-lg bg-slate-400 cursor-not-allowed px-4 py-2 text-sm font-semibold text-white">
                      Configure Storage →
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Create First Request (Optional) */}
          <div className={`rounded-xl border-2 p-6 transition-all duration-200 ${setupComplete ? 'border-blue-200 bg-white shadow-sm' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${setupComplete ? 'bg-blue-600 text-white' : 'bg-slate-400 text-white'}`}>
                    3
                  </span>
                  <h3 className="ml-3 text-lg font-semibold text-slate-900">
                    Create Your First Document Request (Optional)
                  </h3>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Once email and storage are configured, you can start creating document requests and setting up routing rules.
                </p>
                {setupComplete && (
                  <Link
                    href="/dashboard/requests/new"
                    className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    Create Request →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Link
              href="/dashboard/requests"
              className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              View Document Requests
            </Link>
            <Link
              href="/dashboard/rules"
              className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Manage Routing Rules
            </Link>
            <Link
              href="/dashboard/integrations"
              className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Email Integrations
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
