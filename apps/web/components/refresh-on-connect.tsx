'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

/**
 * Component that forces a hard refresh when a connection is successful
 * This ensures the page shows the updated connection status
 */
function RefreshOnConnectInner() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');

  useEffect(() => {
    if (success && (success === 'gmail_connected' || success === 'outlook_connected')) {
      // Force a hard refresh after a short delay to show the success message
      const timer = setTimeout(() => {
        // Remove the success param and refresh
        const url = new URL(window.location.href);
        url.searchParams.delete('success');
        window.history.replaceState({}, '', url.toString());
        // Force a hard refresh to get fresh data from the server
        window.location.reload();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [success]);

  return null;
}

export function RefreshOnConnect() {
  return (
    <Suspense fallback={null}>
      <RefreshOnConnectInner />
    </Suspense>
  );
}

