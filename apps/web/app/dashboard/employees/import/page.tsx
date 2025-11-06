'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/lib/hooks/use-toast';
import {
  detectFieldMapping,
  validateImportData,
  IMPORTABLE_FIELDS,
  FIELD_MAPPING_SUGGESTIONS,
  type ImportFieldMapping,
  type ImportRow,
} from '@/lib/utils/employee-import';

type ImportStep = 'upload' | 'preview' | 'mapping' | 'validation' | 'confirm';

export default function ImportEmployeesPage() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<ImportStep>('upload');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [fieldMapping, setFieldMapping] = useState<ImportFieldMapping>({});
  const [validation, setValidation] = useState<any>(null);
  const [createNewUsers, setCreateNewUsers] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/employees/import/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to preview file');
      }

      setPreviewData(data);
      setFieldMapping(data.fieldMapping || {});
      // If validation is already done, go to validation step
      if (data.validation) {
        setValidation(data.validation);
        setStep('validation');
      } else {
        setStep('mapping');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldMappingChange = (csvColumn: string, dbField: string) => {
    setFieldMapping((prev) => ({
      ...prev,
      [csvColumn]: dbField,
    }));
  };

  const handleValidate = async () => {
    if (!previewData) return;

    setLoading(true);

    try {
      // Re-upload with new mapping to get updated validation
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }

      const response = await fetch('/api/employees/import/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to re-validate file');
      }

      // Update field mapping and validation
      setFieldMapping(data.fieldMapping || {});
      if (data.validation) {
        setValidation(data.validation);
        setStep('validation');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to validate data');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!previewData || !validation) return;

    setLoading(true);

    try {
      // Prepare rows for import - use the mapped data from validation
      const rowsToImport = validation.validRows.map((row: ImportRow) => row.mapped);

      const response = await fetch('/api/employees/import/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rows: rowsToImport,
          fieldMapping,
          createNewUsers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import employees');
      }

      const created = data.results?.created || 0;
      const updated = data.results?.updated || 0;
      toast.success(
        `Import completed: ${created} created, ${updated} updated`
      );
      router.push('/dashboard/employees');
    } catch (error: any) {
      toast.error(error.message || 'Failed to import employees');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Import Employees</h1>
              <p className="mt-1 text-sm text-gray-600">
                Upload a CSV or Excel file to import employee data
              </p>
            </div>
            <Link
              href="/dashboard/employees"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← Back to Directory
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File (CSV or Excel)
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {file && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  File Requirements:
                </h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Maximum file size: 10MB</li>
                  <li>Maximum rows: 1,000</li>
                  <li>Required columns: email, full_name</li>
                  <li>Supported formats: CSV, Excel (.xlsx)</li>
                </ul>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Uploading...' : 'Upload & Preview'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Field Mapping */}
          {step === 'mapping' && previewData && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Map CSV Columns to Database Fields
                </h2>
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          CSV Column
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Database Field
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.headers.map((header: string) => (
                        <tr key={header}>
                          <td className="px-4 py-3 text-sm text-gray-900">{header}</td>
                          <td className="px-4 py-3">
                            <select
                              value={fieldMapping[header] || ''}
                              onChange={(e) =>
                                handleFieldMappingChange(header, e.target.value)
                              }
                              className="block w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                              <option value="">-- Skip --</option>
                              {IMPORTABLE_FIELDS.map((field) => (
                                <option key={field} value={field}>
                                  {field} {field === 'email' || field === 'full_name' ? '(required)' : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  onClick={handleValidate}
                  disabled={!fieldMapping.email || !fieldMapping.full_name || loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Validating...' : 'Validate →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Validation */}
          {step === 'validation' && validation && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Validation Results
                </h2>

                {/* Summary */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-900">
                      {validation.totalRows}
                    </div>
                    <div className="text-sm text-blue-700">Total Rows</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-900">
                      {validation.validCount}
                    </div>
                    <div className="text-sm text-green-700">Valid</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-900">
                      {validation.errorCount}
                    </div>
                    <div className="text-sm text-red-700">Errors</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-900">
                      {validation.warningCount}
                    </div>
                    <div className="text-sm text-yellow-700">Warnings</div>
                  </div>
                </div>

                {/* Errors */}
                {validation.invalidRows.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-red-900 mb-2">
                      Errors ({validation.invalidRows.length} rows)
                    </h3>
                    <div className="border border-red-200 rounded-md max-h-48 overflow-y-auto">
                      <table className="min-w-full divide-y divide-red-200">
                        <thead className="bg-red-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-red-900">
                              Row
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-red-900">
                              Errors
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-red-100">
                          {validation.invalidRows.slice(0, 10).map((row: ImportRow) => (
                            <tr key={row.rowIndex}>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {row.rowIndex}
                              </td>
                              <td className="px-4 py-2 text-sm text-red-700">
                                {row.errors.join(', ')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Options */}
                <div className="border border-gray-200 rounded-md p-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={createNewUsers}
                      onChange={(e) => setCreateNewUsers(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Create authentication accounts for new employees (they will need to set passwords)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('mapping')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={validation.validCount === 0 || loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Importing...' : 'Import Employees →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

