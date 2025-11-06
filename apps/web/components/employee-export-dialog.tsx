'use client';

import { useState } from 'react';
import { DEFAULT_EXPORT_FIELDS, FIELD_LABELS, ExportFormat } from '@/lib/utils/employee-export';
import { useToast } from '@/lib/hooks/use-toast';

interface EmployeeExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeCount: number;
  selectedEmployeeIds?: string[];
  filters?: {
    department?: string;
    team?: string;
    role?: string;
  };
}

export default function EmployeeExportDialog({
  isOpen,
  onClose,
  employeeCount,
  selectedEmployeeIds = [],
  filters = {},
}: EmployeeExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_EXPORT_FIELDS);
  const [exportScope, setExportScope] = useState<'all' | 'filtered' | 'selected'>(
    selectedEmployeeIds.length > 0 ? 'selected' : 'all'
  );
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  if (!isOpen) return null;

  const handleExport = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/employees/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format,
          fields: selectedFields,
          employeeIds: exportScope === 'selected' ? selectedEmployeeIds : null,
          filters: exportScope === 'filtered' ? filters : {},
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `employees_${new Date().toISOString().split('T')[0]}.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Download file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${employeeCount} employees successfully`);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to export employees');
    } finally {
      setLoading(false);
    }
  };

  const toggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter((f) => f !== field));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const selectAllFields = () => {
    setSelectedFields(DEFAULT_EXPORT_FIELDS);
  };

  const deselectAllFields = () => {
    setSelectedFields([]);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">Export Employees</h2>
            <p className="mt-1 text-sm text-gray-600">
              Choose format and fields to export
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Export Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <div className="flex gap-4">
                {(['csv', 'xlsx', 'json'] as ExportFormat[]).map((fmt) => (
                  <label key={fmt} className="flex items-center">
                    <input
                      type="radio"
                      name="format"
                      value={fmt}
                      checked={format === fmt}
                      onChange={(e) => setFormat(e.target.value as ExportFormat)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700 uppercase">{fmt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Export Scope */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Scope
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="scope"
                    value="all"
                    checked={exportScope === 'all'}
                    onChange={(e) => setExportScope(e.target.value as any)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    All employees ({employeeCount})
                  </span>
                </label>
                {Object.keys(filters).length > 0 && (
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="scope"
                      value="filtered"
                      checked={exportScope === 'filtered'}
                      onChange={(e) => setExportScope(e.target.value as any)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Filtered employees
                    </span>
                  </label>
                )}
                {selectedEmployeeIds.length > 0 && (
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="scope"
                      value="selected"
                      checked={exportScope === 'selected'}
                      onChange={(e) => setExportScope(e.target.value as any)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Selected employees ({selectedEmployeeIds.length})
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Fields Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Fields to Export
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllFields}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Select All
                  </button>
                  <span className="text-xs text-gray-400">|</span>
                  <button
                    type="button"
                    onClick={deselectAllFields}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="border border-gray-200 rounded-md p-3 max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {DEFAULT_EXPORT_FIELDS.map((field) => (
                    <label key={field} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field)}
                        onChange={() => toggleField(field)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {FIELD_LABELS[field] || field}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              {selectedFields.length === 0 && (
                <p className="mt-2 text-sm text-red-600">
                  Please select at least one field to export
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={loading || selectedFields.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Exporting...
                </span>
              ) : (
                'Export'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

