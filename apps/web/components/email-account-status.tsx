'use client';

import { useState } from 'react';
import Link from 'next/link';

interface EmailAccountStatusProps {
  account: {
    id: string;
    email: string;
    provider: 'gmail' | 'outlook';
    is_active: boolean;
    expires_at: string | null;
    last_sync_at: string | null;
  };
}

export function EmailAccountStatus({ account }: EmailAccountStatusProps) {
  const [checking, setChecking] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const response = await fetch('/api/email/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id }),
      });

      const data = await response.json();

      if (data.hasError) {
        setTokenError(data.errorMessage || 'Token error detected');
      } else {
        setTokenError(null);
      }
    } catch (error: any) {
      setTokenError(error.message || 'Failed to check token status');
    } finally {
      setChecking(false);
    }
  };

  // Determine token status based on expiration
  const getTokenStatus = () => {
    if (!account.expires_at) {
      return { status: 'unknown', label: 'Unknown', color: 'gray' };
    }
    
    const expiresAt = new Date(account.expires_at);
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    if (expiresAt < now) {
      return { status: 'expired', label: 'Expired', color: 'red' };
    } else if (expiresAt < oneHourFromNow) {
      return { status: 'expiring', label: 'Expiring Soon', color: 'yellow' };
    } else {
      return { status: 'valid', label: 'Valid', color: 'green' };
    }
  };

  const tokenStatus = getTokenStatus();
  const reconnectUrl = account.provider === 'outlook' ? '/auth/microsoft' : '/auth/google';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {account.is_active ? (
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            <span className="text-sm text-gray-600">Active</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-400"></span>
            <span className="text-sm text-gray-600">Inactive</span>
          </span>
        )}
        
        {account.is_active && account.expires_at && (
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
              tokenStatus.color === 'red'
                ? 'bg-red-100 text-red-800'
                : tokenStatus.color === 'yellow'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            Token: {tokenStatus.label}
          </span>
        )}
      </div>

      {tokenError && (
        <div className="rounded-md bg-red-50 p-3 border border-red-200">
          <div className="flex items-start gap-2">
            <svg
              className="h-5 w-5 text-red-600 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Token Error Detected</p>
              <p className="mt-1 text-xs text-red-600">{tokenError}</p>
              <div className="mt-2 flex gap-2">
                <Link
                  href={reconnectUrl}
                  className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                >
                  Reconnect Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {account.last_sync_at && (
        <p className="text-xs text-gray-500">
          Last sync: {new Date(account.last_sync_at).toLocaleString()}
        </p>
      )}
      {!account.last_sync_at && (
        <p className="text-xs text-gray-500">Never synced</p>
      )}

      {account.is_active && (
        <button
          onClick={handleCheckStatus}
          disabled={checking}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          {checking ? 'Checking...' : 'Check Token Status'}
        </button>
      )}
    </div>
  );
}

