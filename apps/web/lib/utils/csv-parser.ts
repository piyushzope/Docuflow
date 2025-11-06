/**
 * CSV parsing utilities for employee import
 */

export interface CSVParsingOptions {
  header?: boolean;
  skipEmptyLines?: boolean;
  delimiter?: string;
}

export interface ParsedRow {
  [key: string]: string | null;
}

export interface ParsingResult {
  data: ParsedRow[];
  errors: string[];
  headers: string[];
}

/**
 * Parse CSV content from a string
 */
export function parseCSV(
  content: string,
  options: CSVParsingOptions = {}
): ParsingResult {
  const {
    header = true,
    skipEmptyLines = true,
    delimiter = ',',
  } = options;

  const errors: string[] = [];
  const lines = content.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length === 0) {
    return {
      data: [],
      errors: ['CSV file is empty'],
      headers: [],
    };
  }

  // Parse headers
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine, delimiter);

  if (!header || headers.length === 0) {
    return {
      data: [],
      errors: ['Invalid CSV format: missing headers'],
      headers: [],
    };
  }

  // Parse data rows
  const data: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (skipEmptyLines && !line) continue;

    const values = parseCSVLine(line, delimiter);
    const row: ParsedRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || null;
    });

    data.push(row);
  }

  return {
    data,
    errors,
    headers,
  };
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add the last value
  values.push(current.trim());

  return values;
}

/**
 * Convert data to CSV format
 */
export function convertToCSV(
  data: Record<string, any>[],
  headers: string[]
): string {
  if (data.length === 0) {
    return headers.join(',');
  }

  const lines: string[] = [headers.join(',')];

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }

      const stringValue = String(value);
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    });

    lines.push(values.join(','));
  }

  return lines.join('\n');
}

