import { Client } from '@microsoft/microsoft-graph-client';
import type {
  EmailIntegration,
  EmailAccountConfig,
  ParsedEmail,
  EmailAttachment,
} from '../types';

export class OutlookClient implements EmailIntegration {
  private client: Client;
  private config: EmailAccountConfig;

  constructor(config: EmailAccountConfig) {
    if (config.provider !== 'outlook') {
      throw new Error('OutlookClient requires provider to be "outlook"');
    }

    this.config = config;

    this.client = Client.init({
      authProvider: (done) => {
        done(null, config.accessToken);
      },
    });
  }

  async listEmails(params?: {
    maxResults?: number;
    query?: string;
    afterDate?: Date;
  }): Promise<ParsedEmail[]> {
    try {
      let url = '/me/messages?$top=' + (params?.maxResults || 50);
      
      if (params?.query) {
        url += `&$filter=contains(subject,'${encodeURIComponent(params.query)}')`;
      }

      if (params?.afterDate) {
        const filter = params.query ? ' and ' : '&$filter=';
        url += `${filter}receivedDateTime ge ${params.afterDate.toISOString()}`;
      }

      url += '&$orderby=receivedDateTime desc';
      url += '&$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,hasAttachments,bodyPreview';

      const response = await this.client.api(url).get();

      const messages = response.value || [];
      const parsedEmails: ParsedEmail[] = [];

      for (const message of messages) {
        const email = await this.getEmail(message.id);
        if (email) {
          parsedEmails.push(email);
        }
      }

      return parsedEmails;
    } catch (error) {
      console.error('Error listing Outlook emails:', error);
      throw error;
    }
  }

  async getEmail(emailId: string): Promise<ParsedEmail | null> {
    try {
      const message = await this.client
        .api(`/me/messages/${emailId}`)
        .select('id,subject,from,toRecipients,ccRecipients,receivedDateTime,body,bodyPreview,attachments')
        .expand('attachments')
        .get();

      if (!message) return null;

      const attachments: EmailAttachment[] = [];
      if (message.attachments) {
        for (const attachment of message.attachments) {
          if (attachment['@odata.type'] === '#microsoft.graph.fileAttachment') {
            attachments.push({
              id: attachment.id,
              filename: attachment.name,
              mimeType: attachment.contentType || 'application/octet-stream',
              size: attachment.size || 0,
              data: attachment.contentBytes
                ? Buffer.from(attachment.contentBytes, 'base64')
                : undefined,
            });
          }
        }
      }

      return {
        id: message.id,
        threadId: message.id, // Outlook uses message ID as thread ID in this context
        from: {
          email: message.from?.emailAddress?.address || '',
          name: message.from?.emailAddress?.name || undefined,
        },
        to: (message.toRecipients || []).map(
          (r: any) => r.emailAddress?.address || ''
        ),
        cc: (message.ccRecipients || []).map(
          (r: any) => r.emailAddress?.address || ''
        ),
        subject: message.subject || '',
        body: {
          text: message.body?.content || message.bodyPreview,
          html: message.body?.contentType === 'html' ? message.body.content : undefined,
        },
        attachments,
        date: new Date(message.receivedDateTime),
        snippet: message.bodyPreview || undefined,
      };
    } catch (error) {
      console.error('Error getting Outlook email:', error);
      return null;
    }
  }

  async downloadAttachment(
    emailId: string,
    attachmentId: string
  ): Promise<Buffer> {
    try {
      const attachment = await this.client
        .api(`/me/messages/${emailId}/attachments/${attachmentId}`)
        .get();

      if (!attachment.contentBytes) {
        throw new Error('Attachment data not found');
      }

      return Buffer.from(attachment.contentBytes, 'base64');
    } catch (error) {
      console.error('Error downloading Outlook attachment:', error);
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
      const message: any = {
        message: {
          subject: params.subject,
          body: {
            contentType: params.htmlBody ? 'html' : 'text',
            content: params.htmlBody || params.body,
          },
          toRecipients: params.to.map((email) => ({
            emailAddress: { address: email },
          })),
        },
      };

      if (params.cc) {
        message.message.ccRecipients = params.cc.map((email) => ({
          emailAddress: { address: email },
        }));
      }

      if (params.attachments && params.attachments.length > 0) {
        message.message.attachments = params.attachments.map((att) => ({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: att.filename,
          contentType: att.mimeType,
          contentBytes: att.content.toString('base64'),
        }));
      }

      const response = await this.client.api('/me/sendMail').post(message);

      // Outlook doesn't return a message ID directly from sendMail
      // We'd need to track it separately or get it from sent items
      return response.id || '';
    } catch (error) {
      console.error('Error sending Outlook email:', error);
      throw error;
    }
  }

  async refreshAccessToken(): Promise<void> {
    // Token refresh should be handled externally
    throw new Error('Token refresh should be handled externally');
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.api('/me').get();
      return true;
    } catch (error) {
      return false;
    }
  }
}
