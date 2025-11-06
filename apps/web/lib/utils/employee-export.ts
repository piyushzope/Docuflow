/**
 * Employee export utilities
 */

import { Database } from '@/types/database.types';
import { convertToCSV } from './csv-parser';
import { convertToExcel, getExcelMimeType } from './excel-parser';

type Profile = Database['public']['Tables']['profiles']['Row'];

export type ExportFormat = 'csv' | 'xlsx' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  employees: Profile[];
  fields?: string[];
}

export interface ExportResult {
  content: string | ArrayBuffer;
  mimeType: string;
  filename: string;
}

/**
 * Default fields to export
 */
export const DEFAULT_EXPORT_FIELDS = [
  'full_name',
  'email',
  'role',
  'job_title',
  'department',
  'team',
  'phone',
  'location',
  'skills',
  'bio',
  'created_at',
  'updated_at',
] as const;

/**
 * Field labels for export headers
 */
export const FIELD_LABELS: Record<string, string> = {
  full_name: 'Full Name',
  email: 'Email',
  role: 'Role',
  job_title: 'Job Title',
  department: 'Department',
  team: 'Team',
  phone: 'Phone',
  location: 'Location',
  skills: 'Skills',
  bio: 'Bio',
  created_at: 'Created At',
  updated_at: 'Updated At',
};

/**
 * Format employee data for export
 */
function formatEmployeeData(employee: Profile, fields: string[]): Record<string, any> {
  const formatted: Record<string, any> = {};

  fields.forEach((field) => {
    let value = (employee as any)[field];

    if (value === null || value === undefined) {
      value = '';
    } else if (field === 'skills' && value) {
      // Format skills array as comma-separated string
      try {
        if (Array.isArray(value)) {
          value = value.join(', ');
        } else if (typeof value === 'string') {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            value = parsed.join(', ');
          } else {
            value = String(value);
          }
        } else {
          value = String(value);
        }
      } catch {
        value = String(value);
      }
    } else if ((field === 'created_at' || field === 'updated_at') && value) {
      // Format dates
      value = new Date(value).toISOString();
    } else {
      value = String(value);
    }

    formatted[field] = value;
  });

  return formatted;
}

/**
 * Export employees to specified format
 */
export function exportEmployees(options: ExportOptions): ExportResult {
  const { format, employees, fields = DEFAULT_EXPORT_FIELDS } = options;

  // Format data
  const formattedData = employees.map((emp) => formatEmployeeData(emp, fields));
  const headers = fields.map((field) => FIELD_LABELS[field] || field);

  // Generate filename
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `employees_${timestamp}.${format}`;

  switch (format) {
    case 'csv': {
      const csvContent = convertToCSV(formattedData, headers);
      return {
        content: csvContent,
        mimeType: 'text/csv',
        filename,
      };
    }

    case 'xlsx': {
      const excelBuffer = convertToExcel(formattedData, headers, 'Employees');
      return {
        content: excelBuffer,
        mimeType: getExcelMimeType(),
        filename,
      };
    }

    case 'json': {
      const jsonContent = JSON.stringify(formattedData, null, 2);
      return {
        content: jsonContent,
        mimeType: 'application/json',
        filename,
      };
    }

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Download export file
 */
export function downloadExport(result: ExportResult): void {
  const blob = result.content instanceof ArrayBuffer
    ? new Blob([result.content], { type: result.mimeType })
    : new Blob([result.content], { type: result.mimeType });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

