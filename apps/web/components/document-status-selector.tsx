'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStatusBadgeClasses, formatStatus } from '@/lib/utils';
import { toast } from 'sonner';

interface DocumentStatusSelectorProps {
  documentId: string;
  currentStatus: 'received' | 'processed' | 'verified' | 'rejected';
}

const validStatuses: Array<'received' | 'processed' | 'verified' | 'rejected'> = [
  'received',
  'processed',
  'verified',
  'rejected',
];

export function DocumentStatusSelector({
  documentId,
  currentStatus,
}: DocumentStatusSelectorProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: typeof currentStatus) => {
    if (newStatus === status) {
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      setStatus(newStatus);
      toast.success('Status updated successfully');
      router.refresh();
    } catch (error: any) {
      console.error('Status update failed:', error);
      toast.error(error.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <select
      value={status}
      onChange={(e) => handleStatusChange(e.target.value as typeof currentStatus)}
      disabled={updating}
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed appearance-none ${getStatusBadgeClasses(status)}`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: 'right 0.25rem center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '1.5em 1.5em',
        paddingRight: '2rem',
      }}
    >
      {validStatuses.map((s) => (
        <option key={s} value={s} className="bg-white text-gray-900">
          {formatStatus(s)}
        </option>
      ))}
    </select>
  );
}

