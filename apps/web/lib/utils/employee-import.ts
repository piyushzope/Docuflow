/**
 * Employee import utilities and validation
 */

import { Database } from '@/types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface ImportFieldMapping {
  [csvColumn: string]: string; // Maps CSV column name to database field name
}

export interface ImportRow {
  rowIndex: number;
  data: Record<string, any>;
  mapped: Record<string, any>;
  errors: string[];
  warnings: string[];
}

export interface ImportValidationResult {
  rows: ImportRow[];
  validRows: ImportRow[];
  invalidRows: ImportRow[];
  duplicateEmails: string[];
  totalRows: number;
  validCount: number;
  errorCount: number;
  warningCount: number;
}

/**
 * Database field definitions
 */
export const IMPORTABLE_FIELDS = [
  'email',
  'full_name',
  'role',
  'job_title',
  'department',
  'team',
  'phone',
  'location',
  'skills',
  'bio',
  'avatar_url',
] as const;

export const REQUIRED_FIELDS = ['email', 'full_name'] as const;

export const FIELD_MAPPING_SUGGESTIONS: Record<string, string[]> = {
  email: ['email', 'e-mail', 'email address', 'e-mail address'],
  full_name: ['full name', 'name', 'fullname', 'employee name', 'person name'],
  role: ['role', 'user role', 'permission', 'access level'],
  job_title: ['job title', 'title', 'position', 'job', 'job position'],
  department: ['department', 'dept', 'division', 'unit'],
  team: ['team', 'group', 'squad', 'pod'],
  phone: ['phone', 'phone number', 'telephone', 'mobile', 'cell'],
  location: ['location', 'office', 'city', 'address', 'office location'],
  skills: ['skills', 'skill', 'expertise', 'competencies'],
  bio: ['bio', 'biography', 'description', 'about', 'summary'],
  avatar_url: ['avatar', 'avatar url', 'photo', 'picture', 'profile picture'],
};

/**
 * Auto-detect field mapping from CSV headers
 */
export function detectFieldMapping(headers: string[]): ImportFieldMapping {
  const mapping: ImportFieldMapping = {};

  headers.forEach((header) => {
    const normalized = header.toLowerCase().trim();

    // Try to find matching field
    for (const [field, suggestions] of Object.entries(FIELD_MAPPING_SUGGESTIONS)) {
      if (suggestions.some((s) => normalized === s || normalized.includes(s))) {
        mapping[header] = field;
        return;
      }
    }

    // Direct match
    if (IMPORTABLE_FIELDS.includes(normalized as any)) {
      mapping[header] = normalized;
    }
  });

  return mapping;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate role
 */
function isValidRole(role: string): boolean {
  return ['owner', 'admin', 'member'].includes(role.toLowerCase());
}

/**
 * Parse skills from string (comma-separated or JSON array)
 */
function parseSkills(skillsInput: string | null | undefined): string[] {
  if (!skillsInput) return [];

  const trimmed = String(skillsInput).trim();
  if (!trimmed) return [];

  // Try JSON array first
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim());
    }
  } catch {
    // Not JSON, try comma-separated
  }

  // Split by comma
  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Validate and map import row
 */
function validateRow(
  row: Record<string, any>,
  rowIndex: number,
  mapping: ImportFieldMapping
): ImportRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const mapped: Record<string, any> = {};

  // Map fields
  Object.entries(mapping).forEach(([csvColumn, dbField]) => {
    const value = row[csvColumn];
    if (value !== null && value !== undefined && String(value).trim()) {
      mapped[dbField] = String(value).trim();
    }
  });

  // Validate required fields
  for (const field of REQUIRED_FIELDS) {
    if (!mapped[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate email format
  if (mapped.email && !isValidEmail(mapped.email)) {
    errors.push('Invalid email format');
  }

  // Validate role
  if (mapped.role && !isValidRole(mapped.role)) {
    errors.push(`Invalid role. Must be one of: owner, admin, member`);
    mapped.role = 'member'; // Default to member
  } else if (!mapped.role) {
    mapped.role = 'member'; // Default to member
  } else {
    mapped.role = mapped.role.toLowerCase();
  }

  // Parse skills
  if (mapped.skills) {
    try {
      mapped.skills = parseSkills(mapped.skills);
    } catch (error) {
      warnings.push(`Failed to parse skills: ${error}`);
      mapped.skills = [];
    }
  }

  // Normalize phone (remove non-digits except +)
  if (mapped.phone) {
    mapped.phone = mapped.phone.replace(/[^\d+]/g, '');
  }

  return {
    rowIndex,
    data: row,
    mapped,
    errors,
    warnings,
  };
}

/**
 * Validate import data
 */
export function validateImportData(
  rows: Record<string, any>[],
  mapping: ImportFieldMapping,
  existingEmails: Set<string> = new Set()
): ImportValidationResult {
  const importRows: ImportRow[] = rows.map((row, index) =>
    validateRow(row, index + 1, mapping)
  );

  // Check for duplicate emails in import data
  const emailMap = new Map<string, number[]>();
  importRows.forEach((row, index) => {
    if (row.mapped.email) {
      const email = row.mapped.email.toLowerCase();
      if (!emailMap.has(email)) {
        emailMap.set(email, []);
      }
      emailMap.get(email)!.push(index);
    }
  });

  // Mark duplicates within import
  const duplicateEmails: string[] = [];
  emailMap.forEach((indices, email) => {
    if (indices.length > 1) {
      duplicateEmails.push(email);
      indices.forEach((index) => {
        importRows[index].errors.push('Duplicate email in import file');
      });
    }
  });

  // Check against existing emails
  importRows.forEach((row) => {
    if (row.mapped.email) {
      const email = row.mapped.email.toLowerCase();
      if (existingEmails.has(email)) {
        row.warnings.push('Employee with this email already exists (will be updated)');
      }
    }
  });

  const validRows = importRows.filter((row) => row.errors.length === 0);
  const invalidRows = importRows.filter((row) => row.errors.length > 0);

  const errorCount = importRows.reduce((sum, row) => sum + row.errors.length, 0);
  const warningCount = importRows.reduce((sum, row) => sum + row.warnings.length, 0);

  return {
    rows: importRows,
    validRows,
    invalidRows,
    duplicateEmails: Array.from(new Set(duplicateEmails)),
    totalRows: rows.length,
    validCount: validRows.length,
    errorCount,
    warningCount,
  };
}

