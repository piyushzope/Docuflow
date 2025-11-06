import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { RefreshOnConnect } from '@/components/refresh-on-connect';
import { DisconnectButton } from '@/components/disconnect-button';
import { ProcessEmailsButton } from '@/components/process-emails-button';
import { RefreshTokensButton } from '@/components/refresh-tokens-button';
import { EmailAccountStatus } from '@/components/email-account-status';

export const dynamic = 'force-dynamic'; // Disable caching for this page

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; details?: string }>;
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

  // Get user's organization and role
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    redirect('/dashboard/organization');
  }

  // Check if user is admin or owner (for manual email processing)
  const isAdminOrOwner = profile.role === 'admin' || profile.role === 'owner';

  // Get email accounts for this organization
  // Get all accounts first, then filter active ones for display
  const { data: allEmailAccounts } = await supabase
    .from('email_accounts')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false });

  // Filter to active accounts for the "Connected Accounts" section
  const emailAccounts = (allEmailAccounts || []).filter((acc: any) => acc.is_active);

  // Group accounts by provider for display
  const gmailAccounts = (allEmailAccounts || []).filter((acc: any) => acc.provider === 'gmail' && acc.is_active);
  const outlookAccounts = (allEmailAccounts || []).filter((acc: any) => acc.provider === 'outlook' && acc.is_active);
  
  // Check if at least one account of each provider is connected
  const gmailConnected = gmailAccounts.length > 0;
  const outlookConnected = outlookAccounts.length > 0;

  return (
    <>
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Email Integrations</h1>
          <p className="mt-2 text-sm text-slate-600">
            Connect your email accounts to automate document collection
          </p>
        </div>

        <RefreshOnConnect />
        {params.error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              {params.error === 'invalid_code' && 'Invalid authorization code. Please try again.'}
              {params.error === 'no_organization' && 'Please create an organization first.'}
              {params.error === 'store_failed' && 'Failed to store email account. Please try again.'}
              {params.error === 'oauth_failed' && (
                <>
                  OAuth authentication failed. Please try again.
                  {params.details && (
                    <div className="mt-2 text-xs text-red-600">
                      Details: {decodeURIComponent(params.details)}
                    </div>
                  )}
                </>
              )}
            </p>
            <p className="mt-2 text-xs text-red-600">
              Check your browser console or server logs for more details.
            </p>
          </div>
        )}

        {params.success && (
          <div className="mb-6 rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">
              {params.success === 'gmail_connected' && 'Gmail account connected successfully!'}
              {params.success === 'outlook_connected' && 'Outlook account connected successfully!'}
            </p>
          </div>
        )}

        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <div className={`rounded-lg border-2 p-6 ${gmailConnected ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  {gmailConnected && (
                    <svg className="mr-2 h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">Gmail</h3>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {gmailConnected ? (
                    <>
                      {gmailAccounts.length === 1 ? (
                        <>Connected: <strong>{gmailAccounts[0].email}</strong></>
                      ) : (
                        <>{gmailAccounts.length} account{gmailAccounts.length > 1 ? 's' : ''} connected</>
                      )}
                    </>
                  ) : (
                    'Connect your Gmail account'
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {gmailConnected && (
                  <span className="rounded-md bg-green-100 px-4 py-2 text-sm font-semibold text-green-800">
                    {gmailAccounts.length} Connected
                  </span>
                )}
                <a
                  href="/auth/google"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  {gmailConnected ? 'Add Another' : 'Connect'}
                </a>
              </div>
            </div>
          </div>

          <div className={`rounded-lg border-2 p-6 ${outlookConnected ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  {outlookConnected && (
                    <svg className="mr-2 h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">Outlook</h3>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {outlookConnected ? (
                    <>
                      {outlookAccounts.length === 1 ? (
                        <>Connected: <strong>{outlookAccounts[0].email}</strong></>
                      ) : (
                        <>{outlookAccounts.length} account{outlookAccounts.length > 1 ? 's' : ''} connected</>
                      )}
                    </>
                  ) : (
                    'Connect your Outlook/Microsoft 365 account'
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {outlookConnected && (
                  <span className="rounded-md bg-green-100 px-4 py-2 text-sm font-semibold text-green-800">
                    {outlookAccounts.length} Connected
                  </span>
                )}
                <a
                  href="/auth/microsoft"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  {outlookConnected ? 'Add Another' : 'Connect'}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Manual Actions (Admin/Owner only) */}
        {isAdminOrOwner && emailAccounts && emailAccounts.length > 0 && (
          <div className="mb-8 space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Email Processing</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Manually trigger email processing for all active accounts. Emails are normally processed automatically every 5 minutes.
                  </p>
                </div>
                <ProcessEmailsButton />
              </div>
            </div>
            
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Token Refresh</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Manually refresh OAuth tokens for all active accounts. Tokens are normally refreshed automatically every hour.
                  </p>
                </div>
                <RefreshTokensButton />
              </div>
            </div>
          </div>
        )}

        {emailAccounts && emailAccounts.length > 0 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Connected Accounts ({emailAccounts.length})
            </h2>
            <div className="space-y-4">
              {emailAccounts.map((account: any) => (
                <div
                  key={account.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium text-gray-900">{account.email}</p>
                        <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 capitalize">
                          {account.provider}
                        </span>
                      </div>
                      <EmailAccountStatus account={account} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <DisconnectButton accountId={account.id} email={account.email} />
                      {!account.is_active && (
                        <Link
                          href={account.provider === 'outlook' ? '/auth/microsoft' : '/auth/google'}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 text-center"
                        >
                          Reconnect
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
