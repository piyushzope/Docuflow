import { createClient } from '@supabase/supabase-js';
import { createEmailClient } from '@docuflow/email-integrations';
import { createStorageAdapter } from '@docuflow/storage-adapters';
import { decrypt } from '@docuflow/shared';
import { matchRoutingRule, generateStoragePath } from './routing';
import type { ParsedEmail, EmailProvider } from '@docuflow/email-integrations';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface EmailProcessingResult {
  processed: number;
  errors: number;
}

/**
 * Process emails for a single email account
 */
async function processEmailAccount(account: any): Promise<EmailProcessingResult> {
  let processed = 0;
  let errors = 0;

  try {
    // Get last sync time or default to 24 hours ago
    const lastSync = account.last_sync_at
      ? new Date(account.last_sync_at)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Decrypt tokens
    const accessToken = decrypt(account.encrypted_access_token);
    const refreshToken = account.encrypted_refresh_token
      ? decrypt(account.encrypted_refresh_token)
      : undefined;

    // Create email client
    const emailClient = createEmailClient({
      provider: account.provider as 'gmail' | 'outlook',
      email: account.email,
      accessToken,
      refreshToken,
      expiresAt: account.expires_at ? new Date(account.expires_at) : undefined,
    });

    // Fetch new emails
    const emails = await emailClient.listEmails({
      maxResults: 50,
      afterDate: lastSync,
    });

    // Get organization's routing rules
    const { data: rules } = await supabase
      .from('routing_rules')
      .select('*')
      .eq('organization_id', account.organization_id)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    // Get default storage config
    const { data: defaultStorage } = await supabase
      .from('storage_configs')
      .select('*')
      .eq('organization_id', account.organization_id)
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    // Process each email
    for (const email of emails) {
      try {
        await processEmail(email, account, rules || [], defaultStorage, emailClient);
        processed++;
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        errors++;
      }
    }

    // Update last sync time
    await supabase
      .from('email_accounts')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', account.id);
  } catch (error) {
    console.error(`Error processing email account ${account.id}:`, error);
    errors++;
  }

  return { processed, errors };
}

/**
 * Process a single email and its attachments
 */
async function processEmail(
  email: ParsedEmail,
  account: any,
  rules: any[],
  defaultStorage: any,
  emailClient: ReturnType<typeof createEmailClient>
): Promise<void> {
  // Look up employee by sender email BEFORE routing to enable employee-specific routing
  const { data: employee } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('organization_id', account.organization_id)
    .eq('email', email.from.email)
    .single();

  // Check if this email matches any document requests BEFORE routing
  // This allows routing to prioritize employee-specific rules for requested documents
  // Import normalizeSubject from routing module (or define locally)
  const normalizeSubject = (subject: string) => {
    if (!subject) return '';
    return subject
      .replace(/^(re|fwd|fw|fwd:re|re:fwd|re:fw|fwd:fw):\s*/gi, '')
      .replace(/^\[.*?\]\s*/g, '')
      .trim();
  };

  let { data: requests } = await supabase
    .from('document_requests')
    .select('id, subject')
    .eq('organization_id', account.organization_id)
    .in('status', ['pending', 'sent', 'received', 'verifying'])
    .ilike('recipient_email', email.from.email);

  // If multiple requests match, try to match by subject (normalized)
  let documentRequestId = null;
  if (requests && requests.length > 0) {
    const normalizedEmailSubject = normalizeSubject(email.subject);
    // Try to find a request where the subject matches (after normalization)
    const subjectMatch = requests.find(req => {
      const normalizedRequestSubject = normalizeSubject(req.subject || '');
      return normalizedEmailSubject.toLowerCase().includes(normalizedRequestSubject.toLowerCase()) ||
             normalizedRequestSubject.toLowerCase().includes(normalizedEmailSubject.toLowerCase());
    });
    documentRequestId = subjectMatch ? subjectMatch.id : requests[0].id;
  }

  // Match routing rules with employee and document request context
  const match = matchRoutingRule(email, rules, employee || null, documentRequestId);

  // Determine storage config
  let storageConfig = defaultStorage;
  if (match) {
    const actions = match.rule.actions as { storage_id: string };
    const { data } = await supabase
      .from('storage_configs')
      .select('*')
      .eq('id', actions.storage_id)
      .single();
    if (data) {
      storageConfig = data;
    }
  }

  if (!storageConfig) {
    throw new Error('No storage configuration found');
  }

  // Create storage adapter
  const config = (storageConfig as any).config || {};
  const adapterConfig: any = { provider: storageConfig.provider, ...config };

  if (storageConfig.provider === 'onedrive') {
    if (config.encrypted_access_token) {
      adapterConfig.accessToken = decrypt(config.encrypted_access_token);
    }
    if (config.encrypted_refresh_token) {
      adapterConfig.refreshToken = decrypt(config.encrypted_refresh_token);
    }
  }

  if (storageConfig.provider === 'google_drive') {
    if (config.encrypted_access_token) {
      adapterConfig.accessToken = decrypt(config.encrypted_access_token);
    }
    if (config.encrypted_refresh_token) {
      adapterConfig.refreshToken = decrypt(config.encrypted_refresh_token);
    }
  }

  if (storageConfig.provider === 'supabase') {
    adapterConfig.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    adapterConfig.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  const storageAdapter = createStorageAdapter(adapterConfig);

  // Generate folder path
  const folderPath = match
    ? generateStoragePath(match.rule, email, '', employee || null)
    : `documents/${new Date().toISOString().split('T')[0]}`;

  // Ensure folder exists
  await storageAdapter.createFolder(folderPath);

  // Process attachments
  // Note: emailClient should be passed as parameter or recreated if needed
  for (const attachment of email.attachments) {
    try {
      // Download attachment
      const fileData = await emailClient.downloadAttachment(
        email.id,
        attachment.id
      );

      // Upload to storage
      const { path: storagePath } = await storageAdapter.uploadFile(
        fileData,
        attachment.filename,
        {
          folderPath,
          metadata: {
            mimeType: attachment.mimeType,
            sender: email.from.email,
            subject: email.subject,
          },
        }
      );

      // documentRequestId was already determined before routing, reuse it here

      // Store document record
      await supabase.from('documents').insert({
        organization_id: account.organization_id,
        email_account_id: account.id,
        routing_rule_id: match?.rule.id || null,
        storage_config_id: storageConfig.id,
        sender_email: email.from.email,
        original_filename: attachment.filename,
        stored_filename: attachment.filename,
        storage_path: storagePath,
        storage_provider: storageConfig.provider,
        file_type: attachment.filename.split('.').pop() || null,
        file_size: attachment.size,
        mime_type: attachment.mimeType,
        document_request_id: documentRequestId,
        metadata: {
          email_id: email.id,
          email_subject: email.subject,
          received_date: email.date.toISOString(),
        },
        status: 'received',
      });

      // Log activity
      await supabase.from('activity_logs').insert({
        organization_id: account.organization_id,
        action: 'upload',
        resource_type: 'document',
        details: {
          filename: attachment.filename,
          storage_path: storagePath,
        },
      });
    } catch (error) {
      console.error(`Error processing attachment ${attachment.id}:`, error);
    }
  }

  // Check if this email matches any document requests
  await checkDocumentRequests(email, account);
}

/**
 * Check if email matches any pending document requests
 */
async function checkDocumentRequests(email: ParsedEmail, account: any): Promise<void> {
  const { data: requests } = await supabase
    .from('document_requests')
    .select('*')
    .eq('organization_id', account.organization_id)
    .eq('status', 'pending')
    .ilike('recipient_email', email.from.email);

  if (!requests || requests.length === 0) {
    return;
  }

  // Update matching requests
  for (const request of requests) {
    await supabase
      .from('document_requests')
      .update({
        status: 'received',
        completed_at: new Date().toISOString(),
      })
      .eq('id', request.id);
  }
}

/**
 * Main polling loop
 */
async function pollEmails(): Promise<void> {
  console.log('Starting email poll...');

  try {
    // Get all active email accounts
    const { data: accounts, error } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching email accounts:', error);
      return;
    }

    if (!accounts || accounts.length === 0) {
      console.log('No active email accounts found');
      return;
    }

    let totalProcessed = 0;
    let totalErrors = 0;

    // Process each account
    for (const account of accounts) {
      const result = await processEmailAccount(account);
      totalProcessed += result.processed;
      totalErrors += result.errors;
    }

    console.log(
      `Poll complete: ${totalProcessed} emails processed, ${totalErrors} errors`
    );
  } catch (error) {
    console.error('Error in email poll:', error);
  }
}

// Start polling
if (require.main === module) {
  console.log('Email worker starting...');
  
  // Initial poll
  pollEmails();

  // Set up interval
  setInterval(pollEmails, POLL_INTERVAL);
}
