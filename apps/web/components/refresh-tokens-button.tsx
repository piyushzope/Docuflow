'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export function RefreshTokensButton() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshTokens = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/refresh-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      console.log('Token refresh response:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          toast.error(data.details || 'You must be an admin or owner to refresh tokens');
        } else {
          toast.error(data.details || data.error || 'Failed to refresh tokens');
        }
        return;
      }

      if (data.success) {
        const { refreshed, errors, duration_ms, results } = data.result || {};
        const duration = duration_ms ? ` (${(duration_ms / 1000).toFixed(1)}s)` : '';
        
        if (refreshed > 0) {
          toast.success(
            `Refreshed ${refreshed} token${refreshed > 1 ? 's' : ''}${duration}`,
            { duration: 5000 }
          );
        } else {
          toast.success(
            `Token refresh completed${duration}. No tokens needed refreshing.`,
            { duration: 3000 }
          );
        }

        if (errors > 0) {
          // Log errors for debugging
          const failedResults = results?.filter((r: any) => !r.success) || [];
          if (failedResults.length > 0) {
            console.error('Token refresh errors:', failedResults);
            const firstError = failedResults[0];
            toast.warning(
              `${errors} error${errors > 1 ? 's' : ''} occurred. ${firstError.accountEmail}: ${firstError.error}`,
              { duration: 10000 }
            );
          }
        }
      }
    } catch (error: any) {
      console.error('Error refreshing tokens:', error);
      toast.error(error.message || 'Failed to refresh tokens');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <button
      onClick={handleRefreshTokens}
      disabled={refreshing}
      className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {refreshing ? (
        <>
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Refreshing...
        </>
      ) : (
        <>
          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Tokens
        </>
      )}
    </button>
  );
}

