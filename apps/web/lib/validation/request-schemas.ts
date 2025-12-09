/**
 * Zod schemas for document request validation
 * Enforces standardized request types and validates required fields
 */

import { z } from 'zod';

// Standard document request type codes (must match database lookup table)
export const REQUEST_TYPE_CODES = [
  'passport',
  'drivers_license',
  'id_card',
  'birth_certificate',
  'visa',
  'ead',
  'mec',
  'ssn',
  'i9',
  'w2',
  'other',
] as const;

export type RequestTypeCode = typeof REQUEST_TYPE_CODES[number];

// Schema for required document type specification
export const requiredDocumentTypeSchema = z.object({
  type: z.enum(REQUEST_TYPE_CODES),
  required: z.boolean().default(true),
  fileTypes: z.array(z.string()).optional(), // e.g., ['PDF', 'JPG']
  description: z.string().optional(),
});

// Schema for creating a document request
export const createRequestSchema = z.object({
  // Recipients (support both single and bulk)
  recipient_email: z.string().email().optional(),
  recipients: z.array(z.string().email()).optional(),
  
  // Email details
  subject: z.string().min(1, 'Subject is required'),
  message_body: z.string().optional().nullable(),
  email_account_id: z.string().uuid().optional().nullable(),
  
  // Request metadata
  request_type: z.enum(REQUEST_TYPE_CODES).optional().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional().nullable(), // YYYY-MM-DD format
  
  // Document requirements
  required_document_types: z.array(requiredDocumentTypeSchema).optional().nullable(),
  expected_document_count: z.number().int().positive().optional().nullable(),
  
  // Template and scheduling
  template_id: z.string().uuid().optional().nullable(),
  send_immediately: z.boolean().default(true),
  scheduled_send_at: z.string().datetime().optional().nullable(), // ISO datetime string
  
  // Reminder and repeat settings
  reminder_months: z.number().int().min(0).max(24).default(1),
  repeat_interval_type: z.enum(['days', 'months']).optional().nullable(),
  repeat_interval_value: z.number().int().positive().optional().nullable(),
}).refine(
  (data) => data.recipient_email || (data.recipients && data.recipients.length > 0),
  {
    message: 'Either recipient_email or recipients array is required',
    path: ['recipient_email'],
  }
);

// Schema for updating a document request
export const updateRequestSchema = z.object({
  recipient_email: z.string().email().optional(),
  subject: z.string().min(1).optional(),
  message_body: z.string().optional().nullable(),
  request_type: z.enum(REQUEST_TYPE_CODES).optional().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional().nullable(), // YYYY-MM-DD format
  status: z.enum(['pending', 'sent', 'received', 'missing_files', 'completed', 'expired', 'verifying']).optional(),
  expected_document_count: z.number().int().positive().optional().nullable(),
  required_document_types: z.array(requiredDocumentTypeSchema).optional().nullable(),
}).partial(); // All fields optional for updates

// Helper function to normalize request type (matches database function)
export function normalizeRequestType(input: string | null | undefined): RequestTypeCode | null {
  if (!input || input.trim() === '') {
    return null;
  }
  
  const normalized = input.toLowerCase().trim();
  
  // Map common variations to standard codes
  const typeMap: Record<string, RequestTypeCode> = {
    'passport': 'passport',
    'passports': 'passport',
    'international passport': 'passport',
    'driver\'s license': 'drivers_license',
    'drivers license': 'drivers_license',
    'drivers_license': 'drivers_license',
    'driver license': 'drivers_license',
    'dl': 'drivers_license',
    'driving license': 'drivers_license',
    'id card': 'id_card',
    'id_card': 'id_card',
    'identification card': 'id_card',
    'id': 'id_card',
    'government id': 'id_card',
    'birth certificate': 'birth_certificate',
    'birth_certificate': 'birth_certificate',
    'birth cert': 'birth_certificate',
    'bc': 'birth_certificate',
    'visa': 'visa',
    'visas': 'visa',
    'travel visa': 'visa',
    'work visa': 'visa',
    'ead': 'ead',
    'employment authorization document': 'ead',
    'work permit': 'ead',
    'mec': 'mec',
    'medical examiner card': 'mec',
    'medical card': 'mec',
    'dot medical card': 'mec',
    'ssn': 'ssn',
    'social security number': 'ssn',
    'social security card': 'ssn',
    'ss card': 'ssn',
    'i-9': 'i9',
    'i9': 'i9',
    'form i-9': 'i9',
    'form i9': 'i9',
    'employment eligibility': 'i9',
    'w-2': 'w2',
    'w2': 'w2',
    'wage statement': 'w2',
    'tax form w-2': 'w2',
  };
  
  if (typeMap[normalized]) {
    return typeMap[normalized];
  }
  
  // If it's already a valid code, return it
  if (REQUEST_TYPE_CODES.includes(normalized as RequestTypeCode)) {
    return normalized as RequestTypeCode;
  }
  
  // Default to 'other'
  return 'other';
}

// Type exports
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
export type RequiredDocumentType = z.infer<typeof requiredDocumentTypeSchema>;

