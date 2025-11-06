'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/hooks/use-toast';

interface EmployeeBulkActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onRefresh?: () => void;
}

export default function EmployeeBulkActions({
  selectedIds,
  onClearSelection,
  onRefresh,
}: EmployeeBulkActionsProps) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleBulkAction = async (action: string, data?: any) => {
    if (selectedIds.length === 0) return;

    setLoading(action);

    try {
      const response = await fetch('/api/employees/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          employeeIds: selectedIds,
          ...data,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Bulk operation failed');
      }

      toast.success(result.message || 'Operation completed successfully');
      onClearSelection();
      if (onRefresh) {
        onRefresh();
      } else {
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to perform bulk operation');
    } finally {
      setLoading(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} employee(s)? This action cannot be undone.`)) {
      return;
    }

    await handleBulkAction('delete');
  };

  const handleBulkExport = async () => {
    // Use export API with selected IDs
    try {
      const response = await fetch('/api/employees/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'csv',
          employeeIds: selectedIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `employees_selected_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${selectedIds.length} employees successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to export employees');
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-3 flex items-center gap-4">
      <div className="text-sm font-medium text-gray-700">
        {selectedIds.length} employee{selectedIds.length !== 1 ? 's' : ''} selected
      </div>
      <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
        <button
          onClick={() => handleBulkAction('edit', { department: '', team: '', role: '' })}
          disabled={loading !== null}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading === 'edit' ? 'Editing...' : 'Edit'}
        </button>
        <button
          onClick={handleBulkExport}
          disabled={loading !== null}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Export
        </button>
        <button
          onClick={handleBulkDelete}
          disabled={loading !== null}
          className="px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
        >
          {loading === 'delete' ? 'Deleting...' : 'Delete'}
        </button>
        <button
          onClick={onClearSelection}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
          aria-label="Clear selection"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

