'use client';

import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

interface IntegrationHealthProps {
  emailAccounts: Array<{
    id: string;
    provider: 'gmail' | 'outlook';
    email: string;
    is_active: boolean;
    last_sync_at: string | null;
    expires_at: string | null;
  }>;
  storageConfigs: Array<{
    id: string;
    provider: string;
    name: string;
    is_active: boolean;
  }>;
  className?: string;
}

export function IntegrationHealth({
  emailAccounts,
  storageConfigs,
  className = '',
}: IntegrationHealthProps) {
  const activeEmailAccounts = emailAccounts.filter((acc) => acc.is_active);
  const activeStorageConfigs = storageConfigs.filter((config) => config.is_active);

  const getEmailStatus = (account: typeof emailAccounts[0]) => {
    if (!account.is_active) {
      return { status: 'error', label: 'Disconnected', color: 'text-red-600' };
    }

    if (account.expires_at) {
      const expiresAt = new Date(account.expires_at);
      const now = new Date();
      const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilExpiry < 24) {
        return { status: 'warning', label: 'Token expiring soon', color: 'text-yellow-600' };
      }
    }

    if (account.last_sync_at) {
      const lastSync = new Date(account.last_sync_at);
      const now = new Date();
      const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

      if (hoursSinceSync > 24) {
        return { status: 'warning', label: 'Sync overdue', color: 'text-yellow-600' };
      }
    }

    return { status: 'healthy', label: 'Connected', color: 'text-green-600' };
  };

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Integration Health</h3>
        <Link
          href="/dashboard/integrations"
          className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
        >
          Manage →
        </Link>
      </div>

      <div className="space-y-4">
        {/* Email Accounts */}
        <div>
          <div className="mb-2 text-sm font-medium text-slate-700">Email Accounts</div>
          {activeEmailAccounts.length === 0 ? (
            <div className="rounded-lg bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">No email accounts connected</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeEmailAccounts.map((account) => {
                const status = getEmailStatus(account);
                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
                        {account.provider === 'gmail' ? (
                          <svg className="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7.5 7.5h9v9h-9v-9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{account.email}</div>
                        <div className={`text-xs ${status.color}`}>{status.label}</div>
                      </div>
                    </div>
                    {account.last_sync_at && (
                      <div className="text-xs text-slate-500">
                        {formatRelativeTime(account.last_sync_at)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Storage Configs */}
        <div>
          <div className="mb-2 text-sm font-medium text-slate-700">Storage</div>
          {activeStorageConfigs.length === 0 ? (
            <div className="rounded-lg bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">No storage configured</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeStorageConfigs.map((config) => (
                <div
                  key={config.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{config.name}</div>
                      <div className="text-xs text-green-600">Active</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

