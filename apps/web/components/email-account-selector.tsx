'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface EmailAccount {
  id: string;
  email: string;
  provider: 'gmail' | 'outlook';
  is_active: boolean;
}

interface EmailAccountSelectorProps {
  value: string | null;
  onChange: (accountId: string | null) => void;
  organizationId?: string;
  className?: string;
}

export default function EmailAccountSelector({
  value,
  onChange,
  organizationId,
  className = '',
}: EmailAccountSelectorProps) {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadAccounts() {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError('Not authenticated');
          return;
        }

        // Get organization ID if not provided
        let orgId = organizationId;
        if (!orgId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

          if (!profile?.organization_id) {
            setError('No organization found');
            return;
          }
          orgId = profile.organization_id;
        }

        // Fetch active email accounts
        const { data: accountsData, error: accountsError } = await supabase
          .from('email_accounts')
          .select('id, email, provider, is_active')
          .eq('organization_id', orgId)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (accountsError) {
          throw accountsError;
        }

        setAccounts((accountsData || []) as EmailAccount[]);

        // Auto-select first account if none selected
        if (!value && accountsData && accountsData.length > 0) {
          onChange(accountsData[0].id);
        }
      } catch (err: any) {
        console.error('Error loading email accounts:', err);
        setError(err.message || 'Failed to load email accounts');
      } finally {
        setLoading(false);
      }
    }

    loadAccounts();
  }, [supabase, organizationId]);

  const getProviderBadge = (provider: string) => {
    const styles = {
      gmail: 'bg-red-100 text-red-800 border-red-200',
      outlook: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return styles[provider as keyof typeof styles] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getProviderIcon = (provider: string) => {
    if (provider === 'gmail') {
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
        </svg>
      );
    }
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5C6.57 3 5 4.57 5 6.5v10.5h5.5V9h5V6.5c0-1.93-1.57-3.5-3.5-3.5zM19 21h-5.5v-6H19v6zm5.5-18H19v6h5.5V6.5c0-1.93-1.57-3.5-3.5-3.5z" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className={className}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Send From Email Account
        </label>
        <div className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
          Loading email accounts...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Send From Email Account
        </label>
        <div className="mt-1 rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">{error}</p>
          {accounts.length === 0 && (
            <Link
              href="/dashboard/integrations"
              className="mt-2 inline-block text-sm text-red-600 hover:text-red-800 underline"
            >
              Connect an email account →
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className={className}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Send From Email Account
        </label>
        <div className="mt-1 rounded-md bg-yellow-50 border border-yellow-200 p-3">
          <p className="text-sm text-yellow-800">
            No active email accounts found. Please connect an email account to send requests.
          </p>
          <Link
            href="/dashboard/integrations"
            className="mt-2 inline-block text-sm text-yellow-700 hover:text-yellow-900 underline font-medium"
          >
            Connect Email Account →
          </Link>
        </div>
      </div>
    );
  }

  const selectedAccount = accounts.find((acc) => acc.id === value);

  return (
    <div className={className}>
      <label
        htmlFor="email_account_id"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Send From Email Account
      </label>
      <select
        id="email_account_id"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.email} ({account.provider === 'gmail' ? 'Gmail' : 'Outlook'})
          </option>
        ))}
      </select>
      {selectedAccount && (
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getProviderBadge(
              selectedAccount.provider
            )}`}
          >
            {getProviderIcon(selectedAccount.provider)}
            {selectedAccount.provider === 'gmail' ? 'Gmail' : 'Outlook'}
          </span>
          <span className="text-xs text-gray-500">
            {selectedAccount.is_active ? (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                Active
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
                Inactive
              </span>
            )}
          </span>
        </div>
      )}
      <p className="mt-1 text-xs text-gray-500">
        Select which email account will send this request
      </p>
    </div>
  );
}

