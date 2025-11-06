export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
          settings: Json
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
          updated_at?: string
          settings?: Json
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
          updated_at?: string
          settings?: Json
        }
      }
      profiles: {
        Row: {
          id: string
          organization_id: string | null
          email: string
          full_name: string | null
          role: 'owner' | 'admin' | 'member'
          job_title: string | null
          department: string | null
          team: string | null
          phone: string | null
          avatar_url: string | null
          skills: Json | null
          bio: string | null
          location: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organization_id?: string | null
          email: string
          full_name?: string | null
          role?: 'owner' | 'admin' | 'member'
          job_title?: string | null
          department?: string | null
          team?: string | null
          phone?: string | null
          avatar_url?: string | null
          skills?: Json | null
          bio?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          email?: string
          full_name?: string | null
          role?: 'owner' | 'admin' | 'member'
          job_title?: string | null
          department?: string | null
          team?: string | null
          phone?: string | null
          avatar_url?: string | null
          skills?: Json | null
          bio?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_accounts: {
        Row: {
          id: string
          organization_id: string
          provider: 'gmail' | 'outlook'
          email: string
          encrypted_access_token: string
          encrypted_refresh_token: string | null
          expires_at: string | null
          last_sync_at: string | null
          is_active: boolean
          sync_settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          provider: 'gmail' | 'outlook'
          email: string
          encrypted_access_token: string
          encrypted_refresh_token?: string | null
          expires_at?: string | null
          last_sync_at?: string | null
          is_active?: boolean
          sync_settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          provider?: 'gmail' | 'outlook'
          email?: string
          encrypted_access_token?: string
          encrypted_refresh_token?: string | null
          expires_at?: string | null
          last_sync_at?: string | null
          is_active?: boolean
          sync_settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      storage_configs: {
        Row: {
          id: string
          organization_id: string
          provider: 'google_drive' | 'onedrive' | 'sharepoint' | 'azure_blob' | 'supabase'
          name: string
          config: Json
          is_default: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          provider: 'google_drive' | 'onedrive' | 'sharepoint' | 'azure_blob' | 'supabase'
          name: string
          config: Json
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          provider?: 'google_drive' | 'onedrive' | 'sharepoint' | 'azure_blob' | 'supabase'
          name?: string
          config?: Json
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      routing_rules: {
        Row: {
          id: string
          organization_id: string
          name: string
          priority: number
          conditions: Json
          actions: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          priority?: number
          conditions: Json
          actions: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          priority?: number
          conditions?: Json
          actions?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      document_requests: {
        Row: {
          id: string
          organization_id: string
          email_account_id: string | null
          recipient_email: string
          subject: string
          message_body: string | null
          request_type: string | null
          status: 'pending' | 'sent' | 'received' | 'missing_files' | 'completed' | 'expired'
          due_date: string | null
          sent_at: string | null
          completed_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          reminder_months: number | null
          repeat_interval_type: 'days' | 'months' | null
          repeat_interval_value: number | null
          template_id: string | null
          parent_request_id: string | null
          last_reminder_sent: string | null
          send_immediately: boolean | null
        }
        Insert: {
          id?: string
          organization_id: string
          email_account_id?: string | null
          recipient_email: string
          subject: string
          message_body?: string | null
          request_type?: string | null
          status?: 'pending' | 'sent' | 'received' | 'missing_files' | 'completed' | 'expired'
          due_date?: string | null
          sent_at?: string | null
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          reminder_months?: number | null
          repeat_interval_type?: 'days' | 'months' | null
          repeat_interval_value?: number | null
          template_id?: string | null
          parent_request_id?: string | null
          last_reminder_sent?: string | null
          send_immediately?: boolean | null
        }
        Update: {
          id?: string
          organization_id?: string
          email_account_id?: string | null
          recipient_email?: string
          subject?: string
          message_body?: string | null
          request_type?: string | null
          status?: 'pending' | 'sent' | 'received' | 'missing_files' | 'completed' | 'expired'
          due_date?: string | null
          sent_at?: string | null
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          reminder_months?: number | null
          repeat_interval_type?: 'days' | 'months' | null
          repeat_interval_value?: number | null
          template_id?: string | null
          parent_request_id?: string | null
          last_reminder_sent?: string | null
          send_immediately?: boolean | null
        }
      }
      request_templates: {
        Row: {
          id: string
          organization_id: string | null
          name: string
          subject: string
          message_body: string | null
          request_type: string | null
          default_due_days: number
          default_reminder_months: number
          is_global: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          name: string
          subject: string
          message_body?: string | null
          request_type?: string | null
          default_due_days?: number
          default_reminder_months?: number
          is_global?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          name?: string
          subject?: string
          message_body?: string | null
          request_type?: string | null
          default_due_days?: number
          default_reminder_months?: number
          is_global?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          organization_id: string
          document_request_id: string | null
          storage_config_id: string | null
          routing_rule_id: string | null
          email_account_id: string | null
          sender_email: string
          original_filename: string
          stored_filename: string | null
          storage_path: string
          storage_provider: 'google_drive' | 'onedrive' | 'sharepoint' | 'azure_blob' | 'supabase'
          file_type: string | null
          file_size: number | null
          mime_type: string | null
          metadata: Json
          status: 'received' | 'processed' | 'verified' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          document_request_id?: string | null
          storage_config_id?: string | null
          routing_rule_id?: string | null
          email_account_id?: string | null
          sender_email: string
          original_filename: string
          stored_filename?: string | null
          storage_path: string
          storage_provider: 'google_drive' | 'onedrive' | 'sharepoint' | 'azure_blob' | 'supabase'
          file_type?: string | null
          file_size?: number | null
          mime_type?: string | null
          metadata?: Json
          status?: 'received' | 'processed' | 'verified' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          document_request_id?: string | null
          storage_config_id?: string | null
          routing_rule_id?: string | null
          email_account_id?: string | null
          sender_email?: string
          original_filename?: string
          stored_filename?: string | null
          storage_path?: string
          storage_provider?: 'google_drive' | 'onedrive' | 'sharepoint' | 'azure_blob' | 'supabase'
          file_type?: string | null
          file_size?: number | null
          mime_type?: string | null
          metadata?: Json
          status?: 'received' | 'processed' | 'verified' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          organization_id: string
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          details: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          details?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          details?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
