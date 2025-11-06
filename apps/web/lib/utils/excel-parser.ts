/**
 * Excel parsing utilities for employee import/export
 */

import * as XLSX from 'xlsx';

export interface ExcelParsingResult {
  data: Record<string, any>[];
  errors: string[];
  headers: string[];
  sheetNames: string[];
}

/**
 * Parse Excel file (XLSX) from buffer
 */
export function parseExcel(
  buffer: ArrayBuffer,
  sheetIndex: number = 0
): ExcelParsingResult {
  const errors: string[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetNames = workbook.SheetNames;

    if (sheetNames.length === 0) {
      return {
        data: [],
        errors: ['Excel file contains no sheets'],
        headers: [],
        sheetNames: [],
      };
    }

    const sheetName = sheetNames[sheetIndex] || sheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      return {
        data: [],
        errors: [`Sheet "${sheetName}" not found`],
        headers: [],
        sheetNames,
      };
    }

    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      raw: false,
    }) as any[][];

    if (jsonData.length === 0) {
      return {
        data: [],
        errors: ['Excel sheet is empty'],
        headers: [],
        sheetNames,
      };
    }

    // First row is headers
    const headers = (jsonData[0] || []).map((h) => String(h || '').trim()).filter(Boolean);

    if (headers.length === 0) {
      return {
        data: [],
        errors: ['No headers found in Excel sheet'],
        headers: [],
        sheetNames,
      };
    }

    // Convert rows to objects
    const data: Record<string, any>[] = [];
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowObj: Record<string, any> = {};

      headers.forEach((header, index) => {
        const value = row[index];
        rowObj[header] = value !== undefined && value !== null ? String(value).trim() : null;
      });

      // Only add non-empty rows
      if (Object.values(rowObj).some((v) => v !== null && v !== '')) {
        data.push(rowObj);
      }
    }

    return {
      data,
      errors,
      headers,
      sheetNames,
    };
  } catch (error: any) {
    return {
      data: [],
      errors: [`Failed to parse Excel file: ${error.message}`],
      headers: [],
      sheetNames: [],
    };
  }
}

/**
 * Convert data to Excel format (XLSX)
 */
export function convertToExcel(
  data: Record<string, any>[],
  headers: string[],
  sheetName: string = 'Employees'
): ArrayBuffer {
  // Prepare data array
  const rows: any[][] = [headers];

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      return value;
    });
    rows.push(values);
  }

  // Create workbook
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Convert to buffer
  const excelBuffer = XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx',
  });

  return excelBuffer.buffer;
}

/**
 * Get Excel file extension
 */
export function getExcelMimeType(): string {
  return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}

