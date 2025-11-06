'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface StorageErrorRecoveryProps {
  error: string;
  details?: string;
  storageId?: string;
  provider?: 'google_drive' | 'onedrive' | 'sharepoint' | 'azure_blob' | 'supabase';
}

export function StorageErrorRecovery({ error, details, storageId, provider }: StorageErrorRecoveryProps) {
  const router = useRouter();

  const getErrorGuidance = () => {
    if (error === 'oauth_failed') {
      return {
        title: 'OAuth Connection Failed',
        steps: [
          'Check that your Microsoft/Google OAuth credentials are configured correctly',
          'Verify the redirect URI matches your Azure/Google Cloud app registration',
          'Ensure you have the necessary permissions granted',
          'Try connecting again',
        ],
        action: storageId && provider === 'onedrive' ? (
          <Link
            href={`/auth/onedrive?storage_id=${storageId}`}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reconnect OneDrive
          </Link>
        ) : storageId && provider === 'google_drive' ? (
          <Link
            href={`/auth/google?storage_id=${storageId}`}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reconnect Google Drive
          </Link>
        ) : null,
      };
    }

    if (error === 'store_failed' && details?.includes('Permission denied')) {
      return {
        title: 'Database Permission Issue',
        steps: [
          'The storage configuration UPDATE policy is not enabled',
          'Run the migration: 20250104000002_allow_users_delete_storage_configs.sql',
          'This allows users to update their storage configurations',
          'Contact your administrator if you need help running migrations',
        ],
        action: (
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open Supabase Dashboard
          </a>
        ),
      };
    }

    if (error === 'store_failed' && details?.includes('Encryption key')) {
      return {
        title: 'Encryption Configuration Missing',
        steps: [
          'The ENCRYPTION_KEY environment variable is not set',
          'Add ENCRYPTION_KEY to your .env.local file',
          'Restart your development server after adding the key',
          'Contact your administrator for production environments',
        ],
        action: null,
      };
    }

    if (error === 'store_failed' && details?.includes('Microsoft OAuth client')) {
      return {
        title: 'OAuth Configuration Missing',
        steps: [
          'MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET are required',
          'Add these to your .env.local file',
          'Get credentials from Azure Portal → App registrations',
          'Restart your development server after adding',
        ],
        action: (
          <a
            href="https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open Azure Portal
          </a>
        ),
      };
    }

    if (error === 'invalid_code' || error === 'invalid_state') {
      return {
        title: 'Authorization Error',
        steps: [
          'The authorization process was interrupted or invalid',
          'Try connecting your account again',
          'Make sure you complete the entire OAuth flow',
          'Do not navigate away during authorization',
        ],
        action: storageId && provider === 'onedrive' ? (
          <Link
            href={`/auth/onedrive?storage_id=${storageId}`}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </Link>
        ) : null,
      };
    }

    if (error === 'storage_not_found') {
      return {
        title: 'Storage Configuration Not Found',
        steps: [
          'The storage configuration may have been deleted',
          'Create a new storage configuration',
          'If you believe this is an error, contact support',
        ],
        action: (
          <Link
            href="/dashboard/storage/new"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Create New Configuration
          </Link>
        ),
      };
    }

    // Generic error
    return {
      title: 'Connection Failed',
      steps: [
        'Check your browser console for detailed error messages',
        'Verify all required environment variables are set',
        'Ensure your network connection is stable',
        'Try again in a few moments',
      ],
        action: storageId ? (
          <button
            onClick={() => router.refresh()}
            className="inline-flex items-center gap-2 rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-500"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Page
          </button>
        ) : null,
    };
  };

  const guidance = getErrorGuidance();

  return (
    <div className="mb-6 rounded-lg border-2 border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-red-900 mb-2">{guidance.title}</h3>
          
          {details && (
            <div className="mb-4 rounded-md bg-red-100 p-3">
              <p className="text-sm text-red-800 font-mono break-all">
                {decodeURIComponent(details)}
              </p>
            </div>
          )}

          <div className="mb-4">
            <p className="text-sm font-medium text-red-900 mb-2">Next Steps:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-sm text-red-800">
              {guidance.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>

          {guidance.action && (
            <div className="mt-4 flex items-center gap-3">
              {guidance.action}
              <Link
                href="/dashboard/storage"
                className="text-sm font-medium text-red-700 hover:text-red-900 underline"
              >
                Back to Storage
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

