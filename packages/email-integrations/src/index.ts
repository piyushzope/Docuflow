export * from './types';
export { GmailClient } from './gmail/gmail-client';
export { OutlookClient } from './outlook/outlook-client';

import type { EmailProvider, EmailAccountConfig } from './types';
import { GmailClient } from './gmail/gmail-client';
import { OutlookClient } from './outlook/outlook-client';
import type { EmailIntegration } from './types';

/**
 * Create an email integration client based on the provider
 */
export function createEmailClient(
  config: EmailAccountConfig
): EmailIntegration {
  switch (config.provider) {
    case 'gmail':
      return new GmailClient(config);
    case 'outlook':
      return new OutlookClient(config);
    default:
      throw new Error(`Unsupported email provider: ${config.provider}`);
  }
}
