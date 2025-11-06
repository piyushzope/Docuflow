'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingButton } from '@/components/loading-button';

export function CreateDefaultRulesButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateDefaults = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rules/create-defaults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create default rules');
      }

      // Refresh the page to show the new rules
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create default rules');
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      <LoadingButton
        onClick={handleCreateDefaults}
        loading={loading}
      >
        Create Default Rules
      </LoadingButton>
    </div>
  );
}

