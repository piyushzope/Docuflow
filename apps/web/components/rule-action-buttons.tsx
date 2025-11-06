'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RuleActionButtonsProps {
  ruleId: string;
  ruleName: string;
}

export function RuleActionButtons({ ruleId, ruleName }: RuleActionButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete the rule "${ruleName}"? This action cannot be undone.`)) {
      return;
    }

    setLoading('delete');
    setError(null);

    try {
      const response = await fetch(`/api/rules/${ruleId}/delete`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete rule');
      }

      // Refresh the page to show updated rules list
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete rule');
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {error && (
        <p className="text-xs text-red-600 whitespace-nowrap">{error}</p>
      )}
      <div className="flex gap-2">
        <Link
          href={`/dashboard/rules/${ruleId}/edit`}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Edit
        </Link>
        <button
          onClick={handleDelete}
          disabled={!!loading}
          className="inline-flex items-center rounded-md border border-red-300 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === 'delete' ? (
            <>
              <svg className="mr-1 h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Deleting...
            </>
          ) : (
            'Delete'
          )}
        </button>
      </div>
    </div>
  );
}

