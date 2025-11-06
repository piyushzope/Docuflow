import { google } from 'googleapis';
import type {
  EmailIntegration,
  EmailAccountConfig,
  ParsedEmail,
  EmailAttachment,
} from '../types';

export class GmailClient implements EmailIntegration {
  private gmail: ReturnType<typeof google.gmail>;
  private config: EmailAccountConfig;

  constructor(config: EmailAccountConfig) {
    if (config.provider !== 'gmail') {
      throw new Error('GmailClient requires provider to be "gmail"');
    }

    this.config = config;

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: config.accessToken,
      refresh_token: config.refreshToken,
    });

    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  }

  async listEmails(params?: {
    maxResults?: number;
    query?: string;
    afterDate?: Date;
  }): Promise<ParsedEmail[]> {
    try {
      const query = params?.query || '';
      const maxResults = params?.maxResults || 50;

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
      });

      const messages = response.data.messages || [];
      const parsedEmails: ParsedEmail[] = [];

      for (const message of messages.slice(0, maxResults)) {
        if (message.id) {
          const email = await this.getEmail(message.id);
          if (email) {
            parsedEmails.push(email);
          }
        }
      }

      return parsedEmails;
    } catch (error) {
      console.error('Error listing Gmail emails:', error);
      throw error;
    }
  }

  async getEmail(emailId: string): Promise<ParsedEmail | null> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: emailId,
        format: 'full',
      });

      const message = response.data;
      if (!message) return null;

      const headers = message.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
          ?.value || '';

      const fromHeader = getHeader('From');
      const fromMatch = fromHeader.match(/^(.+?)\s*<(.+?)>$/);
      const fromName = fromMatch ? fromMatch[1].trim().replace(/['"]/g, '') : '';
      const fromEmail = fromMatch ? fromMatch[2] : fromHeader;

      const bodyParts = this.extractBodyParts(message.payload);
      const attachments = await this.extractAttachments(message);

      return {
        id: message.id || '',
        threadId: message.threadId || '',
        from: {
          email: fromEmail,
          name: fromName || undefined,
        },
        to: this.parseEmailList(getHeader('To')),
        cc: this.parseEmailList(getHeader('Cc')),
        subject: getHeader('Subject'),
        body: bodyParts,
        attachments,
        date: new Date(parseInt(message.internalDate || '0')),
        snippet: message.snippet || undefined,
      };
    } catch (error) {
      console.error('Error getting Gmail email:', error);
      return null;
    }
  }

  async downloadAttachment(
    emailId: string,
    attachmentId: string
  ): Promise<Buffer> {
    try {
      const response = await this.gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: emailId,
        id: attachmentId,
      });

      if (!response.data.data) {
        throw new Error('Attachment data not found');
      }

      return Buffer.from(response.data.data, 'base64');
    } catch (error) {
      console.error('Error downloading Gmail attachment:', error);
      throw error;
    }
  }

  async sendEmail(params: {
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
  }): Promise<string> {
    try {
      // Build email message
      const boundary = '----=_Part_0_' + Date.now();
      let rawMessage = '';

      // Headers
      rawMessage += `To: ${params.to.join(', ')}\r\n`;
      if (params.cc) {
        rawMessage += `Cc: ${params.cc.join(', ')}\r\n`;
      }
      rawMessage += `Subject: ${params.subject}\r\n`;
      rawMessage += `MIME-Version: 1.0\r\n`;
      rawMessage += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

      // Body
      rawMessage += `--${boundary}\r\n`;
      if (params.htmlBody) {
        rawMessage += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
        rawMessage += params.htmlBody + '\r\n';
      } else {
        rawMessage += `Content-Type: text/plain; charset=utf-8\r\n\r\n`;
        rawMessage += params.body + '\r\n';
      }

      // Attachments
      if (params.attachments) {
        for (const attachment of params.attachments) {
          rawMessage += `--${boundary}\r\n`;
          rawMessage += `Content-Type: ${attachment.mimeType}\r\n`;
          rawMessage += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
          rawMessage += `Content-Transfer-Encoding: base64\r\n\r\n`;
          rawMessage += attachment.content.toString('base64') + '\r\n';
        }
      }

      rawMessage += `--${boundary}--`;

      const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      return response.data.id || '';
    } catch (error) {
      console.error('Error sending Gmail email:', error);
      throw error;
    }
  }

  async refreshAccessToken(): Promise<void> {
    // Token refresh should be handled by the OAuth2 client automatically
    // This method can be used to force a refresh if needed
    throw new Error('Token refresh should be handled externally');
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.gmail.users.getProfile({ userId: 'me' });
      return true;
    } catch (error) {
      return false;
    }
  }

  private extractBodyParts(payload: any): { text?: string; html?: string } {
    const bodyParts: { text?: string; html?: string } = {};

    if (payload.body?.data) {
      const content = Buffer.from(payload.body.data, 'base64').toString();
      if (payload.mimeType === 'text/plain') {
        bodyParts.text = content;
      } else if (payload.mimeType === 'text/html') {
        bodyParts.html = content;
      }
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          bodyParts.text =
            Buffer.from(part.body.data, 'base64').toString();
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          bodyParts.html = Buffer.from(part.body.data, 'base64').toString();
        }

        // Check nested parts (multipart/alternative)
        if (part.parts) {
          const nested = this.extractBodyParts(part);
          if (nested.text) bodyParts.text = nested.text;
          if (nested.html) bodyParts.html = nested.html;
        }
      }
    }

    return bodyParts;
  }

  private async extractAttachments(message: any): Promise<EmailAttachment[]> {
    const attachments: EmailAttachment[] = [];

    const extractFromParts = (parts: any[]) => {
      for (const part of parts) {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            id: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType || 'application/octet-stream',
            size: part.body.size || 0,
          });
        }
        if (part.parts) {
          extractFromParts(part.parts);
        }
      }
    };

    if (message.payload?.parts) {
      extractFromParts(message.payload.parts);
    }

    return attachments;
  }

  private parseEmailList(header: string): string[] {
    if (!header) return [];
    return header.split(',').map((email) => email.trim());
  }
}
