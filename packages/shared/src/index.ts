// Database types matching Supabase schema
export type Organization = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  settings: Record<string, unknown>;
};

export type Profile = {
  id: string;
  organization_id: string | null;
  email: string;
  full_name: string | null;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
  updated_at: string;
};

export type EmailProvider = 'gmail' | 'outlook';

export type EmailAccount = {
  id: string;
  organization_id: string;
  provider: EmailProvider;
  email: string;
  encrypted_access_token: string;
  encrypted_refresh_token: string | null;
  expires_at: string | null;
  last_sync_at: string | null;
  is_active: boolean;
  sync_settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type StorageProvider = 'google_drive' | 'onedrive' | 'sharepoint' | 'azure_blob' | 'supabase';

export type StorageConfig = {
  id: string;
  organization_id: string;
  provider: StorageProvider;
  name: string;
  config: Record<string, unknown>;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type RoutingRule = {
  id: string;
  organization_id: string;
  name: string;
  priority: number;
  conditions: {
    sender_pattern?: string;
    subject_pattern?: string;
    file_types?: string[];
    [key: string]: unknown;
  };
  actions: {
    storage_id: string;
    folder_path: string;
    metadata?: Record<string, unknown>;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DocumentRequestStatus = 'pending' | 'sent' | 'received' | 'missing_files' | 'completed' | 'expired' | 'verifying';

export type DocumentRequest = {
  id: string;
  organization_id: string;
  email_account_id: string | null;
  recipient_email: string;
  subject: string;
  message_body: string | null;
  request_type: string | null;
  status: DocumentRequestStatus;
  due_date: string | null;
  sent_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentStatus = 'received' | 'processed' | 'verified' | 'rejected';

export type Document = {
  id: string;
  organization_id: string;
  document_request_id: string | null;
  storage_config_id: string | null;
  routing_rule_id: string | null;
  email_account_id: string | null;
  sender_email: string;
  original_filename: string;
  stored_filename: string | null;
  storage_path: string;
  storage_provider: StorageProvider;
  file_type: string | null;
  file_size: number | null;
  mime_type: string | null;
  metadata: Record<string, unknown>;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
};

export type ActivityLog = {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

// Utility types
export type ApiResponse<T> = {
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
};

// Encryption utilities
export { encrypt, decrypt, hash } from './encryption';
