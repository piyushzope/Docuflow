// Edge Function: process-emails
// Deployment Date: 2025-11-03T01:52:31.689Z
// Project: nneyhfhdthpxmkemyenm
//
// Copy everything below this line:
//
// Supabase Edge Function to process emails
// Scheduled via Supabase Cron jobs (pg_cron)
// 
// This function:
// 1. Fetches all active email accounts
// 2. Processes new emails for each account
// 3. Applies routing rules
// 4. Stores documents in configured storage
// 5. Updates document requests status

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ParsedEmail {
  id: string;
  threadId: string;
  from: { email: string; name?: string };
  to: string[];
  cc?: string[];
  subject: string;
  body: { text?: string; html?: string };
  attachments: Array<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    data?: Uint8Array;
  }>;
  date: Date;
  snippet?: string;
}

interface RoutingRule {
  id: string;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  priority: number;
  is_active: boolean;
}

interface RoutingRuleMatch {
  rule: RoutingRule;
  score: number;
}

interface EmailProcessingResult {
  processed: number;
  errors: number;
  accountId: string;
  accountEmail: string;
}

// Simple XOR encryption/decryption (matches @docuflow/shared)
function decrypt(encryptedText: string, key: string): string {
  if (!encryptedText) return encryptedText;
  try {
    const text = atob(encryptedText);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    throw new Error('Failed to decrypt data');
  }
}

// Gmail API helpers
async function fetchGmailMessages(
  accessToken: string,
  maxResults: number = 50,
  afterDate?: Date
): Promise<string[]> {
  let query = '';
  if (afterDate) {
    query = `after:${Math.floor(afterDate.getTime() / 1000)}`;
  }

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${new URLSearchParams({
      maxResults: String(maxResults),
      q: query,
    })}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.statusText}`);
  }

  const data = await response.json();
  return (data.messages || []).map((m: any) => m.id);
}

async function fetchGmailMessage(accessToken: string, messageId: string): Promise<ParsedEmail | null> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.statusText}`);
  }

  const message = await response.json();
  if (!message) return null;

  const headers = message.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

  const fromHeader = getHeader('From');
  const fromMatch = fromHeader.match(/^(.+?)\s*<(.+?)>$/);
  const fromName = fromMatch ? fromMatch[1].trim().replace(/['"]/g, '') : '';
  const fromEmail = fromMatch ? fromMatch[2] : fromHeader;

  const attachments: ParsedEmail['attachments'] = [];
  if (message.payload?.parts) {
    for (const part of message.payload.parts) {
      if (part.body?.attachmentId && part.filename) {
        attachments.push({
          id: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          size: part.body.size || 0,
        });
      }
    }
  }

  return {
    id: message.id || '',
    threadId: message.threadId || '',
    from: { email: fromEmail, name: fromName || undefined },
    to: getHeader('To').split(',').map((e: string) => e.trim()),
    cc: getHeader('Cc') ? getHeader('Cc').split(',').map((e: string) => e.trim()) : undefined,
    subject: getHeader('Subject'),
    body: {
      text: message.snippet || '',
    },
    attachments,
    date: new Date(parseInt(message.internalDate || '0')),
    snippet: message.snippet || undefined,
  };
}

async function downloadGmailAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string
): Promise<Uint8Array> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.statusText}`);
  }

  const data = await response.json();
  return Uint8Array.from(atob(data.data), (c) => c.charCodeAt(0));
}

// Outlook/Microsoft Graph API helpers
async function fetchOutlookMessages(
  accessToken: string,
  maxResults: number = 50,
  afterDate?: Date
): Promise<string[]> {
  let filter = '';
  if (afterDate) {
    filter = `&$filter=receivedDateTime ge ${afterDate.toISOString()}`;
  }

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?$top=${maxResults}&$orderby=receivedDateTime desc${filter}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Microsoft Graph API error: ${response.statusText}`);
  }

  const data = await response.json();
  return (data.value || []).map((m: any) => m.id);
}

async function fetchOutlookMessage(accessToken: string, messageId: string): Promise<ParsedEmail | null> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${messageId}?$expand=attachments`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Microsoft Graph API error: ${response.statusText}`);
  }

  const message = await response.json();
  if (!message) return null;

  const attachments: ParsedEmail['attachments'] = [];
  if (message.attachments) {
    for (const att of message.attachments) {
      if (att['@odata.type'] === '#microsoft.graph.fileAttachment' && att.name) {
        attachments.push({
          id: att.id,
          filename: att.name,
          mimeType: att.contentType || 'application/octet-stream',
          size: att.size || 0,
          data: att.contentBytes ? Uint8Array.from(atob(att.contentBytes), (c) => c.charCodeAt(0)) : undefined,
        });
      }
    }
  }

  return {
    id: message.id,
    threadId: message.id,
    from: {
      email: message.from?.emailAddress?.address || '',
      name: message.from?.emailAddress?.name || undefined,
    },
    to: (message.toRecipients || []).map((r: any) => r.emailAddress?.address || ''),
    cc: (message.ccRecipients || []).map((r: any) => r.emailAddress?.address || ''),
    subject: message.subject || '',
    body: {
      text: message.body?.content || message.bodyPreview,
      html: message.body?.contentType === 'html' ? message.body.content : undefined,
    },
    attachments,
    date: new Date(message.receivedDateTime),
    snippet: message.bodyPreview || undefined,
  };
}

async function downloadOutlookAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string
): Promise<Uint8Array> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments/${attachmentId}/$value`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Microsoft Graph API error: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

// Helper function to normalize email subjects (remove Re:, Fwd:, etc.)
function normalizeSubject(subject: string): string {
  if (!subject) return '';
  // Remove common email prefixes (case-insensitive)
  return subject
    .replace(/^(re|fwd|fw|fwd:re|re:fwd|re:fw|fwd:fw):\s*/gi, '')
    .replace(/^\[.*?\]\s*/g, '') // Remove bracketed prefixes like [External]
    .trim();
}

// Routing logic
function matchRoutingRule(email: ParsedEmail, rules: RoutingRule[]): RoutingRuleMatch | null {
  const activeRules = rules.filter((r) => r.is_active);
  if (activeRules.length === 0) return null;

  const sortedRules = [...activeRules].sort((a, b) => b.priority - a.priority);
  const matches: RoutingRuleMatch[] = [];

  // Normalize subject for matching (handles Re:, Fwd:, etc.)
  const normalizedSubject = normalizeSubject(email.subject);

  for (const rule of sortedRules) {
    const conditions = rule.conditions as {
      sender_pattern?: string;
      subject_pattern?: string;
      file_types?: string[];
    };

    let score = 0;
    let matchesAll = true;

    if (conditions.sender_pattern) {
      const pattern = new RegExp(conditions.sender_pattern, 'i');
      if (pattern.test(email.from.email)) {
        score += 10;
      } else {
        matchesAll = false;
      }
    }

    if (conditions.subject_pattern) {
      const pattern = new RegExp(conditions.subject_pattern, 'i');
      // Try matching both original and normalized subject
      const originalMatch = pattern.test(email.subject);
      const normalizedMatch = pattern.test(normalizedSubject);
      if (originalMatch || normalizedMatch) {
        score += 10;
      } else {
        matchesAll = false;
      }
    }

    if (conditions.file_types && conditions.file_types.length > 0) {
      const emailFileTypes = email.attachments.map((att) => {
        const ext = att.filename.split('.').pop()?.toLowerCase() || '';
        return ext;
      });

      const hasMatchingFileType = emailFileTypes.some((type) => conditions.file_types!.includes(type));
      if (hasMatchingFileType && email.attachments.length > 0) {
        score += 5;
      } else if (conditions.file_types.length > 0) {
        matchesAll = false;
      }
    }

    if (matchesAll && score > 0) {
      matches.push({ rule, score });
    }
  }

  if (matches.length === 0) return null;

  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.rule.priority - a.rule.priority;
  });

  return matches[0];
}

function generateStoragePath(
  rule: RoutingRule,
  email: ParsedEmail,
  employee?: { email: string; full_name: string | null } | null
): string {
  const actions = rule.actions as { folder_path: string };
  let path = actions.folder_path || '';

  path = path.replace('{sender_email}', email.from.email);
  path = path.replace('{sender_name}', email.from.name || email.from.email);
  if (employee) {
    path = path.replace('{employee_email}', employee.email);
    path = path.replace('{employee_name}', employee.full_name || employee.email);
  } else {
    path = path.replace('{employee_email}', email.from.email);
    path = path.replace('{employee_name}', email.from.name || email.from.email);
  }
  path = path.replace('{date}', new Date().toISOString().split('T')[0]);
  path = path.replace('{year}', new Date().getFullYear().toString());
  path = path.replace('{month}', (new Date().getMonth() + 1).toString().padStart(2, '0'));
  path = path.replace(/[<>:"|?*\x00-\x1f]/g, '_');
  path = path.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');

  return path;
}

// Storage adapter helpers (for Supabase Storage)
async function uploadToSupabaseStorage(
  supabase: any,
  bucket: string,
  file: Uint8Array,
  path: string,
  contentType?: string
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType,
    upsert: false,
  });

  if (error) throw new Error(`Supabase Storage error: ${error.message}`);
  return data.path;
}

// OneDrive helpers using Microsoft Graph API
async function ensureOneDriveFolderExists(
  accessToken: string,
  folderPath: string,
  rootFolderPath?: string
): Promise<void> {
  if (!folderPath) return; // root folder always exists

  // Build full path including root folder if specified
  const fullPath = rootFolderPath 
    ? `${rootFolderPath}/${folderPath}`.replace(/\/+/g, '/').replace(/^\/|\/$/g, '')
    : folderPath.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');

  const parts = fullPath.split('/').filter(Boolean);
  let currentPath = '';

  for (const part of parts) {
    const nextPath = currentPath ? `${currentPath}/${part}` : part;
    
    // Check if folder exists
    const normalizedPath = encodeURI(nextPath);
    const checkUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${normalizedPath}`;
    
    const checkResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (checkResponse.status === 404) {
      // Folder doesn't exist, create it
      const parentPath = currentPath ? encodeURI(currentPath) : '';
      const createUrl = parentPath
        ? `https://graph.microsoft.com/v1.0/me/drive/root:/${parentPath}:/children`
        : 'https://graph.microsoft.com/v1.0/me/drive/root/children';

      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: part,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename',
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create OneDrive folder ${nextPath}: ${errorText}`);
      }
    } else if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      throw new Error(`Failed to check OneDrive folder ${nextPath}: ${errorText}`);
    }

    currentPath = nextPath;
  }
}

async function uploadToOneDrive(
  accessToken: string,
  file: Uint8Array,
  filename: string,
  folderPath: string,
  rootFolderPath?: string
): Promise<string> {
  // Ensure folder exists first
  await ensureOneDriveFolderExists(accessToken, folderPath, rootFolderPath);

  // Build full path
  const fullPath = rootFolderPath
    ? `${rootFolderPath}/${folderPath}/${filename}`.replace(/\/+/g, '/').replace(/^\/|\/$/g, '')
    : `${folderPath}/${filename}`.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');

  const targetPath = encodeURI(fullPath);
  const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${targetPath}:/content`;

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: file,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload to OneDrive: ${errorText}`);
  }

  const result = await response.json();
  // Return the drive item id as the path identifier
  return result.id || result.item?.id || '';
}

// Google Drive helpers using Google Drive API
async function ensureGoogleDriveFolderExists(
  accessToken: string,
  folderPath: string,
  rootFolderId?: string
): Promise<string> {
  const parts = folderPath.split('/').filter(Boolean);
  let currentFolderId = rootFolderId || 'root';

  for (const part of parts) {
    // Check if folder exists
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(part)}' and '${currentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!searchResponse.ok) {
      throw new Error(`Failed to search Google Drive folder: ${await searchResponse.text()}`);
    }

    const searchData = await searchResponse.json();
    let folderId: string;

    if (searchData.files && searchData.files.length > 0) {
      folderId = searchData.files[0].id;
    } else {
      // Create folder
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: part,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [currentFolderId],
        }),
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create Google Drive folder: ${await createResponse.text()}`);
      }

      const createData = await createResponse.json();
      folderId = createData.id;
    }

    currentFolderId = folderId;
  }

  return currentFolderId;
}

async function uploadToGoogleDrive(
  accessToken: string,
  file: Uint8Array,
  filename: string,
  folderPath: string,
  rootFolderId?: string,
  mimeType?: string
): Promise<string> {
  // Ensure folder exists and get its ID
  const parentFolderId = await ensureGoogleDriveFolderExists(accessToken, folderPath, rootFolderId);

  // Step 1: Create file metadata and get upload URL
  const metadataResponse = await fetch('https://www.googleapis.com/drive/v3/files?uploadType=resumable', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: filename,
      parents: [parentFolderId],
    }),
  });

  if (!metadataResponse.ok) {
    const errorText = await metadataResponse.text();
    throw new Error(`Failed to create Google Drive file metadata: ${errorText}`);
  }

  const uploadUrl = metadataResponse.headers.get('location');
  if (!uploadUrl) {
    throw new Error('Google Drive did not return upload URL');
  }

  // Step 2: Upload file content
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType || 'application/octet-stream',
      'Content-Length': file.length.toString(),
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Failed to upload file content to Google Drive: ${errorText}`);
  }

  const result = await uploadResponse.json();
  return result.id || '';
}

// Process a single email
async function processEmail(
  supabase: any,
  email: ParsedEmail,
  account: any,
  rules: RoutingRule[],
  defaultStorage: any,
  accessToken: string,
  provider: string,
  encryptionKey: string
): Promise<void> {
  const match = matchRoutingRule(email, rules);
  let storageConfig = defaultStorage;

  if (match) {
    const actions = match.rule.actions as { storage_id: string };
    const { data } = await supabase
      .from('storage_configs')
      .select('*')
      .eq('id', actions.storage_id)
      .single();
    if (data) storageConfig = data;
  }

  if (!storageConfig) {
    throw new Error('No storage configuration found');
  }

  // Look up employee by sender email
  const { data: employee } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('organization_id', account.organization_id)
    .eq('email', email.from.email)
    .single();

  const folderPath = match
    ? generateStoragePath(match.rule, email, employee || null)
    : `documents/${new Date().toISOString().split('T')[0]}`;

  // Process attachments
  for (const attachment of email.attachments) {
    try {
      let fileData: Uint8Array;
      
      // Get attachment data
      if (attachment.data) {
        fileData = attachment.data;
      } else if (provider === 'gmail') {
        fileData = await downloadGmailAttachment(accessToken, email.id, attachment.id);
      } else if (provider === 'outlook') {
        fileData = await downloadOutlookAttachment(accessToken, email.id, attachment.id);
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      // Upload to storage based on provider
      let storagePath: string;
      const configData = storageConfig.config as any || {};
      
      if (storageConfig.provider === 'supabase') {
        const bucket = configData.bucket || 'documents';
        storagePath = await uploadToSupabaseStorage(
          supabase,
          bucket,
          fileData,
          `${folderPath}/${attachment.filename}`,
          attachment.mimeType
        );
      } else if (storageConfig.provider === 'onedrive') {
        // Decrypt OneDrive access token if encrypted
        const oneDriveToken = configData.encrypted_access_token
          ? decrypt(configData.encrypted_access_token, encryptionKey)
          : configData.accessToken;
        
        if (!oneDriveToken) {
          throw new Error('OneDrive access token not found');
        }

        const rootFolderPath = configData.rootFolderPath || '';
        try {
          storagePath = await uploadToOneDrive(
            oneDriveToken,
            fileData,
            attachment.filename,
            folderPath,
            rootFolderPath
          );
          console.log(`Successfully uploaded ${attachment.filename} to OneDrive at path: ${folderPath}`);
        } catch (uploadError) {
          console.error(`OneDrive upload failed for ${attachment.filename}:`, uploadError);
          throw uploadError; // Re-throw to be caught by outer try-catch
        }
      } else if (storageConfig.provider === 'google_drive') {
        // Decrypt Google Drive access token if encrypted
        const googleToken = configData.encrypted_access_token
          ? decrypt(configData.encrypted_access_token, encryptionKey)
          : configData.accessToken;
        
        if (!googleToken) {
          throw new Error('Google Drive access token not found');
        }

        const rootFolderId = configData.rootFolderId || 'root';
        storagePath = await uploadToGoogleDrive(
          googleToken,
          fileData,
          attachment.filename,
          folderPath,
          rootFolderId,
          attachment.mimeType
        );
        console.log(`Successfully uploaded ${attachment.filename} to Google Drive at path: ${folderPath}`);
      } else {
        throw new Error(`Unsupported storage provider: ${storageConfig.provider}`);
      }

      // Check if this email matches any document requests BEFORE storing the document
      // This allows us to link the document to the request
      // Match by recipient email and optionally by subject (normalized to handle Re:, Fwd:, etc.)
      let { data: requests } = await supabase
        .from('document_requests')
        .select('id, subject')
        .eq('organization_id', account.organization_id)
        .in('status', ['pending', 'sent'])
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

  // Check if this email matches any document requests and update their status
  // Note: Documents are already linked to requests during attachment processing above
  const { data: requests } = await supabase
    .from('document_requests')
    .select('*, repeat_interval_type, repeat_interval_value')
    .eq('organization_id', account.organization_id)
    .in('status', ['pending', 'sent'])
    .ilike('recipient_email', email.from.email);

  if (requests && requests.length > 0) {
    for (const request of requests) {
      await supabase
        .from('document_requests')
        .update({
          status: 'received',
          completed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      // If this request has repeat settings, create a new repeated request
      if (request.repeat_interval_type && request.repeat_interval_value) {
        try {
          const { data: newRequestId } = await supabase.rpc('create_repeated_request', {
            parent_request_id: request.id,
          });
          
          if (newRequestId) {
            console.log(`Created repeated request ${newRequestId} from parent ${request.id}`);
          }
        } catch (err) {
          console.error(`Error creating repeated request for ${request.id}:`, err);
        }
      }
    }
  }
}

// Process emails for a single account
async function processEmailAccount(
  supabase: any,
  account: any,
  encryptionKey: string
): Promise<EmailProcessingResult> {
  let processed = 0;
  let errors = 0;

  try {
    const lastSync = account.last_sync_at
      ? new Date(account.last_sync_at)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const accessToken = decrypt(account.encrypted_access_token, encryptionKey);

    // Fetch emails based on provider
    let messageIds: string[] = [];
    if (account.provider === 'gmail') {
      messageIds = await fetchGmailMessages(accessToken, 50, lastSync);
    } else if (account.provider === 'outlook') {
      messageIds = await fetchOutlookMessages(accessToken, 50, lastSync);
    } else {
      throw new Error(`Unsupported provider: ${account.provider}`);
    }

    // Get routing rules and storage config
    const { data: rules } = await supabase
      .from('routing_rules')
      .select('*')
      .eq('organization_id', account.organization_id)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    const { data: defaultStorage } = await supabase
      .from('storage_configs')
      .select('*')
      .eq('organization_id', account.organization_id)
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    // Process each email
    for (const messageId of messageIds) {
      try {
        let email: ParsedEmail | null = null;
        if (account.provider === 'gmail') {
          email = await fetchGmailMessage(accessToken, messageId);
        } else if (account.provider === 'outlook') {
          email = await fetchOutlookMessage(accessToken, messageId);
        }

        if (email && email.attachments.length > 0) {
          await processEmail(
            supabase,
            email,
            account,
            rules || [],
            defaultStorage,
            accessToken,
            account.provider,
            encryptionKey
          );
          processed++;
        }
      } catch (error) {
        console.error(`Error processing email ${messageId}:`, error);
        errors++;
      }
    }

    // Update last sync time
    await supabase
      .from('email_accounts')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', account.id);

    return { processed, errors, accountId: account.id, accountEmail: account.email };
  } catch (error) {
    console.error(`Error processing email account ${account.id}:`, error);
    return { processed, errors: errors + 1, accountId: account.id, accountEmail: account.email };
  }
}

// Main handler
serve(async (req) => {
  const startTime = Date.now();
  console.log('Email processing Edge Function started');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    if (!encryptionKey) {
      throw new Error('Missing ENCRYPTION_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: accounts, error: accountsError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('is_active', true);

    if (accountsError) {
      throw accountsError;
    }

    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active email accounts found',
          processed: 0,
          accounts_processed: 0,
          duration_ms: Date.now() - startTime,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results: EmailProcessingResult[] = [];
    let totalProcessed = 0;
    let totalErrors = 0;

    for (const account of accounts) {
      try {
        const result = await processEmailAccount(supabase, account, encryptionKey);
        results.push(result);
        totalProcessed += result.processed;
        totalErrors += result.errors;
      } catch (error) {
        console.error(`Failed to process account ${account.id}:`, error);
        totalErrors++;
        results.push({
          processed: 0,
          errors: 1,
          accountId: account.id,
          accountEmail: account.email,
        });
      }
    }

    const duration = Date.now() - startTime;
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email processing completed',
        processed: totalProcessed,
        errors: totalErrors,
        accounts_processed: accounts.length,
        account_results: results,
        duration_ms: duration,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Email processing failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: duration,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
