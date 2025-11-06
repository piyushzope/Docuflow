export type EmailProvider = 'gmail' | 'outlook';

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  data?: Buffer | Uint8Array; // Optional, may not always fetch the actual data
}

export interface ParsedEmail {
  id: string;
  threadId: string;
  from: {
    email: string;
    name?: string;
  };
  to: string[];
  cc?: string[];
  subject: string;
  body: {
    text?: string;
    html?: string;
  };
  attachments: EmailAttachment[];
  date: Date;
  snippet?: string;
}

export interface EmailAccountConfig {
  provider: EmailProvider;
  email: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface EmailIntegration {
  /**
   * List emails from the account
   */
  listEmails(params?: {
    maxResults?: number;
    query?: string;
    afterDate?: Date;
  }): Promise<ParsedEmail[]>;

  /**
   * Get a specific email by ID
   */
  getEmail(emailId: string): Promise<ParsedEmail | null>;

  /**
   * Download an attachment from an email
   */
  downloadAttachment(
    emailId: string,
    attachmentId: string
  ): Promise<Buffer>;

  /**
   * Send an email
   */
  sendEmail(params: {
    to: string[];
    cc?: string[];
    subject: string;
    body: string;
    htmlBody?: string;
    attachments?: Array<{
      filename: string;
      content: Buffer;
      mimeType: string;
    }>;
  }): Promise<string>;

  /**
   * Refresh the access token if needed
   */
  refreshAccessToken(): Promise<void>;

  /**
   * Check if the connection is valid
   */
  testConnection(): Promise<boolean>;
}
