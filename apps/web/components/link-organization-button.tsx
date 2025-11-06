'use client';

import { useState } from 'react';
import { LoadingButton } from '@/components/loading-button';

interface LinkOrganizationButtonProps {
  organizationId: string;
  organizationName: string;
}

export function LinkOrganizationButton({ 
  organizationId, 
  organizationName 
}: LinkOrganizationButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLink = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/organization/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to link organization');
      }

      // Redirect to setup page
      window.location.href = '/dashboard/setup';
    } catch (err: any) {
      setError(err.message || 'Failed to link organization');
      setLoading(false);
    }
  };

  return (
    <div>
      <LoadingButton
        type="button"
        onClick={handleLink}
        loading={loading}
        className="bg-yellow-600 hover:bg-yellow-500"
      >
        Link to {organizationName}
      </LoadingButton>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
