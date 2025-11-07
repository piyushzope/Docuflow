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
  errorDetails?: string[]; // Array of error messages for this account
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

function encrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

// Validate OAuth token format
// Microsoft Graph API can return:
// 1. JWT tokens (with dots: header.payload.signature) - starts with "eyJ"
// 2. Opaque tokens (no dots) - starts with various prefixes like "Ew...", "0.A...", etc.
// Google OAuth tokens are always JWTs
function validateTokenFormat(token: string, provider?: string): boolean {
  // Basic validation: must be a non-empty string
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Tokens should be at least 10 characters (very short tokens are likely invalid)
  if (token.length < 10) {
    return false;
  }
  
  // JWT tokens have dots (header.payload.signature)
  if (token.includes('.')) {
    const parts = token.split('.');
    // JWT tokens should have at least 2 parts (header.payload or header.payload.signature)
    return parts.length >= 2;
  }
  
  // Opaque tokens (Microsoft) don't have dots but are valid
  // They typically start with "Ew", "0.A", or other prefixes
  // Microsoft opaque tokens are typically 1000+ characters long
  // Accept any non-empty string without dots as potentially valid opaque token
  // This is especially important for Microsoft tokens which are often opaque
  if (provider === 'outlook' || provider === 'onedrive') {
    // Microsoft tokens without dots are valid opaque tokens
    return token.trim().length > 0;
  }
  
  // For other providers or unknown, also accept opaque tokens if they're long enough
  // (Google tokens should always be JWT, but we'll be lenient here)
  return token.trim().length > 0;
}

// Refresh Google OAuth token
async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google token refresh failed: ${error}`);
  }

  return await response.json();
}

// Refresh Microsoft OAuth token
async function refreshMicrosoftToken(
  refreshToken: string,
  tenantId?: string
): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
  const tenant = tenantId || 'common';
  console.log(`🔄 Calling Microsoft token refresh API (tenant: ${tenant})`);
  
  const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: Deno.env.get('MICROSOFT_CLIENT_ID') || '',
      client_secret: Deno.env.get('MICROSOFT_CLIENT_SECRET') || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/.default offline_access',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ Microsoft token refresh API error:`, {
      status: response.status,
      statusText: response.statusText,
      error: error.substring(0, 200), // Limit error message length
    });
    throw new Error(`Microsoft token refresh failed: ${error}`);
  }

  const result = await response.json();
  console.log(`✅ Microsoft token refresh response:`, {
    hasAccessToken: !!result.access_token,
    accessTokenLength: result.access_token?.length || 0,
    accessTokenPreview: result.access_token ? result.access_token.substring(0, 30) + '...' : 'missing',
    hasRefreshToken: !!result.refresh_token,
    expiresIn: result.expires_in,
  });
  
  return result;
}

// Refresh account tokens and update database
async function refreshAccountTokens(
  supabase: any,
  account: any,
  encryptionKey: string
): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  try {
    if (!account.encrypted_refresh_token) {
      return {
        success: false,
        error: 'No refresh token available',
      };
    }

    console.log(`🔄 Attempting to refresh token for ${account.provider} account: ${account.email}`);
    const refreshToken = decrypt(account.encrypted_refresh_token, encryptionKey);
    
    // Validate refresh token format
    if (!validateTokenFormat(refreshToken, account.provider)) {
      console.error(`❌ Refresh token is malformed for account ${account.email}:`, {
        tokenLength: refreshToken.length,
        tokenPreview: refreshToken.substring(0, 20) + '...',
        hasDots: refreshToken.includes('.'),
        provider: account.provider,
      });
      return {
        success: false,
        error: 'Refresh token is malformed. Please reconnect account.',
      };
    }
    
    let newAccessToken: string;
    let newRefreshToken: string | undefined;
    let expiresIn: number;

    if (account.provider === 'gmail') {
      const result = await refreshGoogleToken(refreshToken);
      newAccessToken = result.access_token;
      expiresIn = result.expires_in;
      console.log(`✅ Google token refresh successful: token length=${newAccessToken.length}`);
    } else if (account.provider === 'outlook') {
      const result = await refreshMicrosoftToken(refreshToken);
      newAccessToken = result.access_token;
      newRefreshToken = result.refresh_token;
      expiresIn = result.expires_in;
      console.log(`✅ Microsoft token refresh successful: token length=${newAccessToken.length}, has refresh=${!!newRefreshToken}`);
    } else {
      return {
        success: false,
        error: `Unsupported provider: ${account.provider}`,
      };
    }

    // Validate new token format
    // Note: Microsoft tokens can be opaque (no dots) or JWT (with dots), both are valid
    if (!validateTokenFormat(newAccessToken, account.provider)) {
      console.error(`❌ Refreshed access token is malformed:`, {
        provider: account.provider,
        tokenLength: newAccessToken?.length || 0,
        tokenPreview: newAccessToken ? newAccessToken.substring(0, 50) + '...' : 'null',
        hasDots: newAccessToken?.includes('.') || false,
        tokenStart: newAccessToken ? newAccessToken.substring(0, 20) : 'null',
        tokenType: newAccessToken ? (newAccessToken.includes('.') ? 'JWT' : 'Opaque') : 'null',
      });
      return {
        success: false,
        error: 'Refreshed token is malformed. Please reconnect account.',
      };
    }
    
    // Log token format for debugging
    const tokenType = newAccessToken.includes('.') ? 'JWT' : 'Opaque';
    console.log(`✅ Token format validated: ${tokenType} token (length=${newAccessToken.length}, provider=${account.provider})`);

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Encrypt and update tokens
    const encryptedAccessToken = encrypt(newAccessToken, encryptionKey);
    const updateData: any = {
      encrypted_access_token: encryptedAccessToken,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (newRefreshToken) {
      updateData.encrypted_refresh_token = encrypt(newRefreshToken, encryptionKey);
    }

    const { error } = await supabase
      .from('email_accounts')
      .update(updateData)
      .eq('id', account.id);

    if (error) {
      throw error;
    }

    console.log(`✅ Successfully refreshed token for account ${account.email}`);
    return {
      success: true,
      accessToken: newAccessToken,
    };
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    console.error(`❌ Failed to refresh token for account ${account.email}:`, errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Refresh storage config tokens and update database
async function refreshStorageConfigTokens(
  supabase: any,
  storageConfig: any,
  encryptionKey: string
): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  try {
    const configData = storageConfig.config as any || {};
    const encryptedRefreshToken = configData.encrypted_refresh_token || configData.encryptedRefreshToken;
    
    if (!encryptedRefreshToken) {
      return {
        success: false,
        error: 'No refresh token available for storage config',
      };
    }

    console.log(`🔄 Attempting to refresh token for ${storageConfig.provider} storage config: ${storageConfig.id}`);
    const refreshToken = decrypt(encryptedRefreshToken, encryptionKey);
    
    // Validate refresh token format
    if (!validateTokenFormat(refreshToken, storageConfig.provider)) {
      console.error(`❌ Refresh token is malformed for storage config ${storageConfig.id}:`, {
        tokenLength: refreshToken.length,
        tokenPreview: refreshToken.substring(0, 20) + '...',
        hasDots: refreshToken.includes('.'),
        provider: storageConfig.provider,
      });
      return {
        success: false,
        error: 'Refresh token is malformed. Please reconnect storage.',
      };
    }
    
    let newAccessToken: string;
    let newRefreshToken: string | undefined;
    let expiresIn: number;

    if (storageConfig.provider === 'google_drive') {
      const result = await refreshGoogleToken(refreshToken);
      newAccessToken = result.access_token;
      expiresIn = result.expires_in;
      console.log(`✅ Google Drive token refresh successful: token length=${newAccessToken.length}`);
    } else if (storageConfig.provider === 'onedrive') {
      const result = await refreshMicrosoftToken(refreshToken);
      newAccessToken = result.access_token;
      newRefreshToken = result.refresh_token;
      expiresIn = result.expires_in;
      console.log(`✅ OneDrive token refresh successful: token length=${newAccessToken.length}, has refresh=${!!newRefreshToken}`);
    } else {
      return {
        success: false,
        error: `Unsupported provider: ${storageConfig.provider}`,
      };
    }

    // Validate new token format
    // Note: Microsoft tokens can be opaque (no dots) or JWT (with dots), both are valid
    if (!validateTokenFormat(newAccessToken, storageConfig.provider)) {
      console.error(`❌ Refreshed access token is malformed:`, {
        provider: storageConfig.provider,
        tokenLength: newAccessToken?.length || 0,
        tokenPreview: newAccessToken ? newAccessToken.substring(0, 50) + '...' : 'null',
        hasDots: newAccessToken?.includes('.') || false,
        tokenStart: newAccessToken ? newAccessToken.substring(0, 20) : 'null',
        tokenType: newAccessToken ? (newAccessToken.includes('.') ? 'JWT' : 'Opaque') : 'null',
      });
      return {
        success: false,
        error: 'Refreshed token is malformed. Please reconnect storage.',
      };
    }
    
    // Log token format for debugging
    const tokenType = newAccessToken.includes('.') ? 'JWT' : 'Opaque';
    console.log(`✅ Token format validated: ${tokenType} token (length=${newAccessToken.length}, provider=${storageConfig.provider})`);

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Encrypt and update tokens in config
    const encryptedAccessToken = encrypt(newAccessToken, encryptionKey);
    const updatedConfig = {
      ...configData,
      encrypted_access_token: encryptedAccessToken,
      accessToken: undefined, // Remove plaintext token if exists
      expires_at: expiresAt.toISOString(),
    };

    if (newRefreshToken) {
      updatedConfig.encrypted_refresh_token = encrypt(newRefreshToken, encryptionKey);
    }

    const { error } = await supabase
      .from('storage_configs')
      .update({
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storageConfig.id);

    if (error) {
      throw error;
    }

    console.log(`✅ Successfully refreshed token for storage config ${storageConfig.id}`);
    return {
      success: true,
      accessToken: newAccessToken,
    };
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    console.error(`❌ Failed to refresh token for storage config ${storageConfig.id}:`, errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
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
    if (response.status === 401) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Gmail API authentication failed (401): Token may be expired. Please refresh OAuth tokens. ${errorText}`);
    }
    const errorText = await response.text().catch(() => '');
    throw new Error(`Gmail API error (${response.status}): ${response.statusText} ${errorText}`);
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
    if (response.status === 401) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Gmail API authentication failed (401): Token may be expired. Please refresh OAuth tokens. ${errorText}`);
    }
    const errorText = await response.text().catch(() => '');
    throw new Error(`Gmail API error (${response.status}): ${response.statusText} ${errorText}`);
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
    if (response.status === 401) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Gmail API authentication failed (401): Token may be expired. Please refresh OAuth tokens. ${errorText}`);
    }
    const errorText = await response.text().catch(() => '');
    throw new Error(`Gmail API error (${response.status}): ${response.statusText} ${errorText}`);
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
    if (response.status === 401) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Microsoft Graph API authentication failed (401): Token may be expired. Please refresh OAuth tokens. ${errorText}`);
    }
    const errorText = await response.text().catch(() => '');
    throw new Error(`Microsoft Graph API error (${response.status}): ${response.statusText} ${errorText}`);
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
    if (response.status === 401) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Microsoft Graph API authentication failed (401): Token may be expired. Please refresh OAuth tokens. ${errorText}`);
    }
    const errorText = await response.text().catch(() => '');
    throw new Error(`Microsoft Graph API error (${response.status}): ${response.statusText} ${errorText}`);
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
    if (response.status === 401) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Microsoft Graph API authentication failed (401): Token may be expired. Please refresh OAuth tokens. ${errorText}`);
    }
    const errorText = await response.text().catch(() => '');
    throw new Error(`Microsoft Graph API error (${response.status}): ${response.statusText} ${errorText}`);
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
function matchRoutingRule(
  email: ParsedEmail, 
  rules: RoutingRule[],
  employee?: { email: string; full_name: string | null } | null,
  documentRequestId?: string | null
): RoutingRuleMatch | null {
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

    // Detect if this rule has no conditions (catch-all rule)
    const hasNoConditions = !conditions.sender_pattern && 
      !conditions.subject_pattern && 
      (!conditions.file_types || conditions.file_types.length === 0);

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

    // Bonus scoring for employee-related documents
    // If this is an employee document or response to a document request, boost catch-all employee rules
    if (hasNoConditions && (employee || documentRequestId)) {
      // Check if this rule's folder path contains employee-related placeholders
      const actions = rule.actions as { folder_path?: string };
      if (actions.folder_path && (
        actions.folder_path.includes('{employee_name}') ||
        actions.folder_path.includes('{employee_email}') ||
        actions.folder_path.includes('employees')
      )) {
        score += 15; // Bonus for employee-related catch-all rules
      }
    }

    // Only consider rules where all conditions match
    // Allow catch-all rules (no conditions) to match even with score 0
    if (matchesAll && (score > 0 || hasNoConditions)) {
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
): Promise<{ id: string; path: string; webUrl?: string }> {
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
  const driveItemId = result.id || result.item?.id || '';
  
  // Get the web URL for the uploaded file
  let webUrl: string | undefined;
  try {
    const itemUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${driveItemId}?$select=webUrl`;
    const itemResponse = await fetch(itemUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (itemResponse.ok) {
      const itemData = await itemResponse.json();
      webUrl = itemData.webUrl;
    }
  } catch (error) {
    // If webUrl retrieval fails, continue without it
    console.warn(`Could not retrieve webUrl for OneDrive file ${driveItemId}:`, error);
  }

  return {
    id: driveItemId,
    path: fullPath,
    webUrl,
  };
}

// Get OneDrive file path and web URL from drive item ID
async function getOneDriveFilePath(
  accessToken: string,
  driveItemId: string
): Promise<{ path: string; webUrl?: string } | null> {
  try {
    // Get item details including parent reference and web URL
    const itemUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${driveItemId}?$select=id,name,parentReference,webUrl`;
    const response = await fetch(itemUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const item = await response.json();
    if (!item) return null;

    // Build path from root to file
    // ParentReference contains the path from root
    let pathParts: string[] = [item.name];
    
    // If we have parentReference with path, use it; otherwise build from parent chain
    if (item.parentReference?.path) {
      // parentReference.path is like "/drive/root:/Documents/Subfolder"
      // We need to extract the path part after "root:"
      const parentPath = item.parentReference.path;
      const pathMatch = parentPath.match(/root:(.+)$/);
      if (pathMatch) {
        const parentPathPart = pathMatch[1].replace(/^\//, '');
        pathParts = parentPathPart ? [parentPathPart, item.name] : [item.name];
      } else {
        pathParts = [item.name];
      }
    } else if (item.parentReference?.id && item.parentReference.id !== 'root') {
      // Recursively get parent path (with limit to avoid infinite loops)
      const parentPath = await getOneDriveFilePath(accessToken, item.parentReference.id);
      if (parentPath) {
        pathParts = [parentPath.path, item.name];
      }
    }

    const fullPath = pathParts.join('/').replace(/\/+/g, '/');

    return {
      path: fullPath,
      webUrl: item.webUrl,
    };
  } catch (error) {
    console.error(`Error retrieving OneDrive file path for ${driveItemId}:`, error);
    return null;
  }
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

// Update document request status based on email response
// This function works for emails with or without attachments
async function updateDocumentRequestStatus(
  supabase: any,
  email: ParsedEmail,
  account: any
): Promise<void> {
  // Check if this email matches any document requests and update their status
  // Match by recipient email and optionally by subject (normalized to handle Re:, Fwd:, etc.)
  // Include 'received' and 'verifying' statuses to ensure we can still link documents
  const { data: requests } = await supabase
    .from('document_requests')
    .select('*, repeat_interval_type, repeat_interval_value, expected_document_count')
    .eq('organization_id', account.organization_id)
    .in('status', ['pending', 'sent', 'received', 'verifying'])
    .ilike('recipient_email', email.from.email);

  if (!requests || requests.length === 0) {
    return; // No matching requests found
  }

  for (const request of requests) {
    // If multiple requests match, try to match by subject (normalized)
    const normalizedEmailSubject = normalizeSubject(email.subject);
    const normalizedRequestSubject = normalizeSubject(request.subject || '');
    
    // Only update if subject matches (to avoid false positives)
    const subjectMatches = 
      normalizedEmailSubject.toLowerCase().includes(normalizedRequestSubject.toLowerCase()) ||
      normalizedRequestSubject.toLowerCase().includes(normalizedEmailSubject.toLowerCase());
    
    if (!subjectMatches && requests.length > 1) {
      // Skip if subject doesn't match and there are multiple requests
      continue;
    }

    // Count documents linked to this request
    const { count: documentCount, error: countError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('document_request_id', request.id);
    
    if (countError) {
      console.error(`Error counting documents for request ${request.id}:`, countError);
    }

    const hasDocuments = (documentCount || 0) > 0;
    
    // Determine new status based on whether documents were received
    let newStatus = 'received';
    if (hasDocuments) {
      // If we have documents, check if we should mark as verifying or completed
      if (request.expected_document_count && documentCount >= request.expected_document_count) {
        // All expected documents received - trigger auto-complete check
        try {
          await supabase.rpc('auto_complete_document_request', { request_id: request.id });
          // Check if it was auto-completed
          const { data: updatedRequest } = await supabase
            .from('document_requests')
            .select('status')
            .eq('id', request.id)
            .single();
          newStatus = updatedRequest?.status || 'verifying';
        } catch (err) {
          console.error(`Error auto-completing request ${request.id}:`, err);
          newStatus = 'verifying'; // Fallback to verifying if auto-complete fails
        }
      } else {
        newStatus = 'verifying'; // Documents received but not all expected ones yet
      }
    }

    // Update request status and document count
    // Note: The trigger will automatically log status change to history
    await supabase
      .from('document_requests')
      .update({
        status: newStatus,
        document_count: documentCount || 0,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : request.completed_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.id);

    console.log(`Updated request ${request.id} to status: ${newStatus} (${documentCount || 0} documents)`);

    // If this request has repeat settings and is completed, create a new repeated request
    if (newStatus === 'completed' && request.repeat_interval_type && request.repeat_interval_value) {
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
  // Look up employee by sender email BEFORE routing to enable employee-specific routing
  const { data: employee } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('organization_id', account.organization_id)
    .eq('email', email.from.email)
    .single();

  // Check if this email matches any document requests BEFORE routing
  // This allows routing to prioritize employee-specific rules for requested documents
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

  // Validate storage configuration before processing
  console.log(`🔍 Validating storage config: ${storageConfig.provider} (${storageConfig.id})`);
  const configData = storageConfig.config as any || {};
  
  // Store validated tokens for reuse (avoid re-decrypting)
  let validatedOneDriveToken: string | null = null;
  let validatedGoogleDriveToken: string | null = null;
  
  try {
    if (storageConfig.provider === 'onedrive' || storageConfig.provider === 'google_drive') {
      const storageAccessToken = configData.encrypted_access_token
        ? decrypt(configData.encrypted_access_token, encryptionKey)
        : configData.accessToken;
      
      if (!storageAccessToken) {
        throw new Error(`${storageConfig.provider} access token not found`);
      }

      // Validate token format
      // Note: Microsoft tokens can be opaque (no dots) or JWT (with dots), both are valid
      const tokenType = storageAccessToken.includes('.') ? 'JWT' : 'Opaque';
      if (!validateTokenFormat(storageAccessToken, storageConfig.provider)) {
        console.error(`❌ Token format validation failed for ${storageConfig.provider}:`, {
          tokenLength: storageAccessToken.length,
          tokenPreview: storageAccessToken.substring(0, 20) + '...',
          hasDots: storageAccessToken.includes('.'),
          tokenType,
          provider: storageConfig.provider,
        });
        throw new Error(`${storageConfig.provider} access token is expired or invalid`);
      }
      
      // Log token format for debugging
      console.log(`✅ Storage token format validated: ${tokenType} token (length=${storageAccessToken.length})`);

      // Test token validity with a simple API call
      // If token is expired (401), attempt to refresh it automatically
      let finalAccessToken = storageAccessToken;
      
      if (storageConfig.provider === 'onedrive') {
        let testResponse = await fetch('https://graph.microsoft.com/v1.0/me/drive/root', {
          headers: {
            Authorization: `Bearer ${finalAccessToken}`,
          },
        });
        
        if (!testResponse.ok && testResponse.status === 401) {
          // Token expired, attempt to refresh
          console.log(`🔄 OneDrive token expired (401), attempting refresh for storage config ${storageConfig.id}...`);
          const refreshResult = await refreshStorageConfigTokens(supabase, storageConfig, encryptionKey);
          
          if (refreshResult.success && refreshResult.accessToken) {
            finalAccessToken = refreshResult.accessToken;
            // Update configData with new encrypted token for subsequent use
            configData.encrypted_access_token = encrypt(finalAccessToken, encryptionKey);
            console.log(`✅ OneDrive token refreshed successfully, retesting...`);
            
            // Retry the API call with new token
            testResponse = await fetch('https://graph.microsoft.com/v1.0/me/drive/root', {
              headers: {
                Authorization: `Bearer ${finalAccessToken}`,
              },
            });
            
            if (!testResponse.ok) {
              const errorText = await testResponse.text().catch(() => '');
              throw new Error(`OneDrive API test failed after refresh: ${testResponse.status} ${testResponse.statusText} ${errorText}`);
            }
          } else {
            throw new Error(`OneDrive access token is expired and refresh failed: ${refreshResult.error || 'Unknown error'}`);
          }
        } else if (!testResponse.ok) {
          const errorText = await testResponse.text().catch(() => '');
          throw new Error(`OneDrive API test failed: ${testResponse.status} ${testResponse.statusText} ${errorText}`);
        }
        
        validatedOneDriveToken = finalAccessToken; // Store validated token for reuse
        console.log(`✅ OneDrive storage config validated`);
      } else if (storageConfig.provider === 'google_drive') {
        let testResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
          headers: {
            Authorization: `Bearer ${finalAccessToken}`,
          },
        });
        
        if (!testResponse.ok && testResponse.status === 401) {
          // Token expired, attempt to refresh
          console.log(`🔄 Google Drive token expired (401), attempting refresh for storage config ${storageConfig.id}...`);
          const refreshResult = await refreshStorageConfigTokens(supabase, storageConfig, encryptionKey);
          
          if (refreshResult.success && refreshResult.accessToken) {
            finalAccessToken = refreshResult.accessToken;
            // Update configData with new encrypted token for subsequent use
            configData.encrypted_access_token = encrypt(finalAccessToken, encryptionKey);
            console.log(`✅ Google Drive token refreshed successfully, retesting...`);
            
            // Retry the API call with new token
            testResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
              headers: {
                Authorization: `Bearer ${finalAccessToken}`,
              },
            });
            
            if (!testResponse.ok) {
              const errorText = await testResponse.text().catch(() => '');
              throw new Error(`Google Drive API test failed after refresh: ${testResponse.status} ${testResponse.statusText} ${errorText}`);
            }
          } else {
            throw new Error(`Google Drive access token is expired and refresh failed: ${refreshResult.error || 'Unknown error'}`);
          }
        } else if (!testResponse.ok) {
          const errorText = await testResponse.text().catch(() => '');
          throw new Error(`Google Drive API test failed: ${testResponse.status} ${testResponse.statusText} ${errorText}`);
        }
        
        validatedGoogleDriveToken = finalAccessToken; // Store validated token for reuse
        console.log(`✅ Google Drive storage config validated`);
      }
    } else if (storageConfig.provider === 'supabase') {
      const bucket = configData.bucket || 'documents';
      // Test Supabase Storage access
      const { error: testError } = await supabase.storage.from(bucket).list('', { limit: 1 });
      if (testError) {
        throw new Error(`Supabase Storage access test failed: ${testError.message}`);
      }
      console.log(`✅ Supabase Storage config validated (bucket: ${bucket})`);
    }
  } catch (validationError: any) {
    const errorMessage = validationError?.message || String(validationError);
    console.error(`❌ Storage config validation failed:`, {
      provider: storageConfig.provider,
      config_id: storageConfig.id,
      error: errorMessage,
    });
    
    // Mark storage config as potentially having issues
    await supabase
      .from('storage_configs')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storageConfig.id);
    
    throw new Error(`Storage configuration validation failed: ${errorMessage}`);
  }

  const folderPath = match
    ? generateStoragePath(match.rule, email, employee || null)
    : `documents/${new Date().toISOString().split('T')[0]}`;

  // Process attachments if they exist
  if (email.attachments && email.attachments.length > 0) {
    for (const attachment of email.attachments) {
      let documentId: string | null = null;
      let uploadError: string | null = null;
      let errorCategory: string | null = null;
      
      try {
        console.log(`📎 Processing attachment: ${attachment.filename} (${attachment.size} bytes, ${attachment.mimeType})`);
        
        let fileData: Uint8Array;
      
        // Get attachment data
        console.log(`⬇️ Downloading attachment ${attachment.id} from ${provider}...`);
        if (attachment.data) {
          fileData = attachment.data;
          console.log(`✅ Using embedded attachment data (${fileData.length} bytes)`);
        } else if (provider === 'gmail') {
          fileData = await downloadGmailAttachment(accessToken, email.id, attachment.id);
          console.log(`✅ Downloaded Gmail attachment (${fileData.length} bytes)`);
        } else if (provider === 'outlook') {
          fileData = await downloadOutlookAttachment(accessToken, email.id, attachment.id);
          console.log(`✅ Downloaded Outlook attachment (${fileData.length} bytes)`);
        } else {
          throw new Error(`Unsupported provider: ${provider}`);
        }

        // Upload to storage based on provider
        console.log(`📤 Uploading ${attachment.filename} to ${storageConfig.provider} at path: ${folderPath}`);
        let storagePath: string;
        let oneDriveResult: { id: string; path: string; webUrl?: string } | null = null;
        const configData = storageConfig.config as any || {};
        
        // Store tokens for verification later
        let oneDriveToken: string | null = null;
        let googleToken: string | null = null;
        let supabaseBucket: string = 'documents'; // Default bucket
        
        if (storageConfig.provider === 'supabase') {
          supabaseBucket = configData.bucket || 'documents';
          storagePath = await uploadToSupabaseStorage(
            supabase,
            supabaseBucket,
            fileData,
            `${folderPath}/${attachment.filename}`,
            attachment.mimeType
          );
          console.log(`✅ Successfully uploaded ${attachment.filename} to Supabase Storage: ${storagePath}`);
        } else if (storageConfig.provider === 'onedrive') {
          // Reuse validated token if available, otherwise decrypt
          if (validatedOneDriveToken) {
            oneDriveToken = validatedOneDriveToken;
            console.log(`✅ Reusing validated OneDrive token`);
          } else {
            // Fallback: decrypt token (shouldn't happen if validation passed)
            oneDriveToken = configData.encrypted_access_token
              ? decrypt(configData.encrypted_access_token, encryptionKey)
              : configData.accessToken;
            
            if (!oneDriveToken) {
              throw new Error('OneDrive access token not found');
            }
            
            // Validate token format as fallback check
            // Note: Microsoft tokens can be opaque (no dots) or JWT (with dots), both are valid
            if (!validateTokenFormat(oneDriveToken, 'onedrive')) {
              console.error(`❌ OneDrive token format invalid after decryption:`, {
                tokenLength: oneDriveToken.length,
                tokenPreview: oneDriveToken.substring(0, 20) + '...',
                hasDots: oneDriveToken.includes('.'),
                tokenType: oneDriveToken.includes('.') ? 'JWT' : 'Opaque',
              });
              throw new Error('OneDrive access token is expired or invalid');
            }
          }

          const rootFolderPath = configData.rootFolderPath || '';
          try {
            oneDriveResult = await uploadToOneDrive(
              oneDriveToken,
              fileData,
              attachment.filename,
              folderPath,
              rootFolderPath
            );
            storagePath = oneDriveResult.id; // Use ID for storage_path (for API operations)
            console.log(`✅ Successfully uploaded ${attachment.filename} to OneDrive at path: ${oneDriveResult.path} (ID: ${storagePath})`);
          } catch (uploadError: any) {
            const errorMessage = uploadError?.message || String(uploadError);
            console.error(`❌ OneDrive upload failed for ${attachment.filename}:`, errorMessage);
            
            // Categorize error
            if (errorMessage.includes('401') || errorMessage.includes('expired') || errorMessage.includes('authentication')) {
              errorCategory = 'token';
            } else if (errorMessage.includes('403') || errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
              errorCategory = 'permission';
            } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
              errorCategory = 'path';
            } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
              errorCategory = 'rate_limit';
            } else {
              errorCategory = 'network';
            }
            
            throw uploadError; // Re-throw to be caught by outer try-catch
          }
        } else if (storageConfig.provider === 'google_drive') {
          // Reuse validated token if available, otherwise decrypt
          if (validatedGoogleDriveToken) {
            googleToken = validatedGoogleDriveToken;
            console.log(`✅ Reusing validated Google Drive token`);
          } else {
            // Fallback: decrypt token (shouldn't happen if validation passed)
            googleToken = configData.encrypted_access_token
              ? decrypt(configData.encrypted_access_token, encryptionKey)
              : configData.accessToken;
            
            if (!googleToken) {
              throw new Error('Google Drive access token not found');
            }
            
            // Validate token format as fallback check
            // Google tokens should always be JWT format (with dots)
            if (!validateTokenFormat(googleToken, 'google_drive')) {
              console.error(`❌ Google Drive token format invalid after decryption:`, {
                tokenLength: googleToken.length,
                tokenPreview: googleToken.substring(0, 20) + '...',
                hasDots: googleToken.includes('.'),
                tokenType: googleToken.includes('.') ? 'JWT' : 'Opaque',
              });
              throw new Error('Google Drive access token is expired or invalid');
            }
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
          console.log(`✅ Successfully uploaded ${attachment.filename} to Google Drive at path: ${folderPath} (ID: ${storagePath})`);
        } else {
          throw new Error(`Unsupported storage provider: ${storageConfig.provider}`);
        }

        // documentRequestId was already determined before routing, reuse it here

        // Build metadata object
        const metadata: any = {
          email_id: email.id,
          email_subject: email.subject,
          received_date: email.date.toISOString(),
          upload_timestamp: new Date().toISOString(),
          storage_path_display: storageConfig.provider === 'onedrive' && oneDriveResult ? oneDriveResult.path : folderPath,
        };

        // Add OneDrive-specific metadata if available
        if (storageConfig.provider === 'onedrive' && oneDriveResult) {
          metadata.onedrive_path = oneDriveResult.path;
          if (oneDriveResult.webUrl) {
            metadata.onedrive_web_url = oneDriveResult.webUrl;
          }
        }

        // Store document record
        const { data: insertedDoc, error: insertError } = await supabase.from('documents').insert({
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
          metadata,
          status: 'received',
          upload_verification_status: 'pending', // Will be verified later
        }).select('id').single();

        if (insertError) {
          throw new Error(`Failed to insert document record: ${insertError.message}`);
        }

        documentId = insertedDoc?.id || null;
        console.log(`✅ Document record created: ${documentId}`);

        // Verify upload after successful database insert
        console.log(`🔍 Verifying upload for ${attachment.filename}...`);
        let verificationStatus = 'pending';
        let verificationError: string | null = null;
        
        try {
          if (storageConfig.provider === 'onedrive' && oneDriveResult) {
            // Verify OneDrive file exists
            const verifyUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${storagePath}?$select=id,name`;
            const verifyResponse = await fetch(verifyUrl, {
              headers: {
                Authorization: `Bearer ${oneDriveToken}`,
              },
            });
            
            if (verifyResponse.ok) {
              verificationStatus = 'verified';
              console.log(`✅ Upload verified: ${attachment.filename} exists in OneDrive`);
            } else {
              verificationStatus = 'not_found';
              verificationError = `File not found in OneDrive (${verifyResponse.status})`;
              console.warn(`⚠️ Upload verification failed: ${verificationError}`);
            }
          } else if (storageConfig.provider === 'google_drive') {
            // Verify Google Drive file exists
            const verifyUrl = `https://www.googleapis.com/drive/v3/files/${storagePath}?fields=id,name`;
            const verifyResponse = await fetch(verifyUrl, {
              headers: {
                Authorization: `Bearer ${googleToken}`,
              },
            });
            
            if (verifyResponse.ok) {
              verificationStatus = 'verified';
              console.log(`✅ Upload verified: ${attachment.filename} exists in Google Drive`);
            } else {
              verificationStatus = 'not_found';
              verificationError = `File not found in Google Drive (${verifyResponse.status})`;
              console.warn(`⚠️ Upload verification failed: ${verificationError}`);
            }
          } else if (storageConfig.provider === 'supabase') {
            // Verify Supabase Storage file exists
            const bucket = supabaseBucket || configData.bucket || 'documents';
            const { data: listData, error: listError } = await supabase.storage
              .from(bucket)
              .list(folderPath, {
                search: attachment.filename,
              });
            
            if (!listError && listData && listData.some((f: any) => f.name === attachment.filename)) {
              verificationStatus = 'verified';
              console.log(`✅ Upload verified: ${attachment.filename} exists in Supabase Storage`);
            } else {
              verificationStatus = 'not_found';
              verificationError = `File not found in Supabase Storage: ${listError?.message || 'Not in listing'}`;
              console.warn(`⚠️ Upload verification failed: ${verificationError}`);
            }
          }
          
          // Update document with verification status
          if (documentId) {
            await supabase
              .from('documents')
              .update({
                upload_verification_status: verificationStatus,
                upload_verified_at: new Date().toISOString(),
                upload_error: verificationError || null,
              })
              .eq('id', documentId);
          }
        } catch (verifyError: any) {
          verificationStatus = 'failed';
          verificationError = verifyError?.message || 'Verification failed';
          console.error(`❌ Upload verification error for ${attachment.filename}:`, verifyError);
          
          // Update document with verification failure
          if (documentId) {
            await supabase
              .from('documents')
              .update({
                upload_verification_status: 'failed',
                upload_verified_at: new Date().toISOString(),
                upload_error: `Verification error: ${verificationError}`,
              })
              .eq('id', documentId);
          }
        }

        // Log activity
        await supabase.from('activity_logs').insert({
          organization_id: account.organization_id,
          action: 'upload',
          resource_type: 'document',
          details: {
            filename: attachment.filename,
            storage_path: storagePath,
            storage_provider: storageConfig.provider,
            file_size: attachment.size,
            document_id: documentId,
            verification_status: verificationStatus,
          },
        });

        // Trigger document validation asynchronously (non-blocking)
        if (documentId && verificationStatus === 'verified') {
          try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
            
            // Check if validation queue is enabled for this organization
            const { data: org } = await supabase
              .from('organizations')
              .select('settings')
              .eq('id', organizationId)
              .single();
            
            const useQueue = org?.settings?.validation?.queue?.enabled === true;
            
            if (useQueue) {
              // Enqueue validation job instead of calling directly
              const { error: enqueueError } = await supabase
                .from('validation_jobs')
                .insert({
                  document_id: documentId,
                  organization_id: organizationId,
                  status: 'pending',
                  next_run_at: new Date().toISOString(),
                });
              
              if (enqueueError) {
                console.warn(`⚠️ Failed to enqueue validation job for document ${documentId}:`, enqueueError);
              } else {
                console.log(`✅ Validation job enqueued for document ${documentId}`);
              }
            } else {
              // Direct call (original behavior)
              const validationUrl = `${supabaseUrl}/functions/v1/validate-document`;
              fetch(validationUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ documentId }),
              }).catch((error) => {
                // Log error but don't fail the email processing
                console.warn(`⚠️ Failed to trigger validation for document ${documentId}:`, error);
              });
            }
            
            console.log(`🔍 Validation triggered for document ${documentId}`);
          } catch (validationError) {
            // Log error but don't fail the email processing
            console.warn(`⚠️ Error triggering validation:`, validationError);
          }
        }
      } catch (error: any) {
        const errorMessage = error?.message || String(error);
        uploadError = errorMessage;
        
        // Categorize error if not already categorized
        if (!errorCategory) {
          if (errorMessage.includes('401') || errorMessage.includes('expired') || errorMessage.includes('authentication')) {
            errorCategory = 'token';
          } else if (errorMessage.includes('403') || errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
            errorCategory = 'permission';
          } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
            errorCategory = 'path';
          } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
            errorCategory = 'rate_limit';
          } else if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connection')) {
            errorCategory = 'network';
          } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
            errorCategory = 'validation';
          } else {
            errorCategory = 'unknown';
          }
        }
        
        console.error(`❌ Error processing attachment ${attachment.id} (${attachment.filename}):`, {
          error: errorMessage,
          category: errorCategory,
          provider: storageConfig.provider,
          folder_path: folderPath,
        });

        // Store failed document record with error details
        try {
          const { data: failedDoc } = await supabase.from('documents').insert({
            organization_id: account.organization_id,
            email_account_id: account.id,
            routing_rule_id: match?.rule.id || null,
            storage_config_id: storageConfig.id,
            sender_email: email.from.email,
            original_filename: attachment.filename,
            stored_filename: attachment.filename,
            storage_provider: storageConfig.provider,
            file_type: attachment.filename.split('.').pop() || null,
            file_size: attachment.size,
            mime_type: attachment.mimeType,
            metadata: {
              email_id: email.id,
              email_subject: email.subject,
              received_date: email.date.toISOString(),
              error_category: errorCategory,
              failed_at: new Date().toISOString(),
            },
            status: 'received',
            upload_error: `[${errorCategory}] ${errorMessage}`,
            upload_verification_status: 'failed',
          }).select('id').single();

          documentId = failedDoc?.id || null;

          // Log error activity
          await supabase.from('activity_logs').insert({
            organization_id: account.organization_id,
            action: 'upload_failed',
            resource_type: 'document',
            details: {
              filename: attachment.filename,
              error: errorMessage,
              category: errorCategory,
              provider: storageConfig.provider,
              folder_path: folderPath,
              document_id: documentId,
            },
          });
        } catch (dbError) {
          console.error(`Failed to store error record in database:`, dbError);
        }
      }
    }
  }

  // Always update document request status, even if there are no attachments
  // This ensures emails without attachments still update the request status
  await updateDocumentRequestStatus(supabase, email, account);
}

// Process emails for a single account
async function processEmailAccount(
  supabase: any,
  account: any,
  encryptionKey: string
): Promise<EmailProcessingResult> {
  let processed = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  try {
    const lastSync = account.last_sync_at
      ? new Date(account.last_sync_at)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Decrypt and validate token format
    let accessToken = decrypt(account.encrypted_access_token, encryptionKey);
    
    // Validate token format immediately after decryption
    // Note: Microsoft tokens can be opaque (no dots) or JWT (with dots), both are valid
    if (!validateTokenFormat(accessToken, account.provider)) {
      console.warn(`⚠️ Token format invalid for account ${account.email}, attempting refresh...`);
      
      // Attempt to refresh if token is malformed
      const refreshResult = await refreshAccountTokens(supabase, account, encryptionKey);
      if (refreshResult.success && refreshResult.accessToken) {
        accessToken = refreshResult.accessToken;
        console.log(`✅ Token refreshed successfully for account ${account.email}`);
      } else {
        // Mark account as needing reconnection
        await supabase
          .from('email_accounts')
          .update({ is_active: false })
          .eq('id', account.id);
        
        const errorMsg = `Token is malformed and refresh failed: ${refreshResult.error || 'Unknown error'}. Please reconnect account.`;
        console.error(`❌ ${errorMsg}`);
        return {
          processed: 0,
          errors: 1,
          accountId: account.id,
          accountEmail: account.email,
          errorDetails: [errorMsg],
        };
      }
    }

    // Helper function to handle API calls with automatic retry on 401
    // Uses a getter function to always get the current accessToken value
    const executeWithRetry = async <T>(
      operationFactory: (token: string) => Promise<T>,
      operationName: string
    ): Promise<T> => {
      try {
        return await operationFactory(accessToken);
      } catch (error: any) {
        const errorMessage = error?.message || String(error);
        
        // Check if this is a 401 authentication error
        if (errorMessage.includes('401') || errorMessage.includes('authentication failed') || errorMessage.includes('expired')) {
          console.log(`🔄 401 error detected for ${operationName}, attempting token refresh...`);
          
          // Attempt to refresh token
          const refreshResult = await refreshAccountTokens(supabase, account, encryptionKey);
          
          if (refreshResult.success && refreshResult.accessToken) {
            // Update access token for retry
            accessToken = refreshResult.accessToken;
            console.log(`✅ Token refreshed, retrying ${operationName}...`);
            
            // Retry the operation once with new token
            try {
              return await operationFactory(accessToken);
            } catch (retryError: any) {
              const retryErrorMessage = retryError?.message || String(retryError);
              throw new Error(`Retry failed after token refresh: ${retryErrorMessage}`);
            }
          } else {
            // Refresh failed - mark account as needing reconnection
            await supabase
              .from('email_accounts')
              .update({ is_active: false })
              .eq('id', account.id);
            
            const refreshErrorMsg = `Token refresh failed: ${refreshResult.error || 'Unknown error'}. Please reconnect account.`;
            console.error(`❌ ${refreshErrorMsg}`);
            throw new Error(refreshErrorMsg);
          }
        }
        
        // Re-throw non-401 errors
        throw error;
      }
    };

    // Fetch emails based on provider with retry support
    let messageIds: string[] = [];
    if (account.provider === 'gmail') {
      messageIds = await executeWithRetry(
        (token) => fetchGmailMessages(token, 50, lastSync),
        'fetchGmailMessages'
      );
    } else if (account.provider === 'outlook') {
      messageIds = await executeWithRetry(
        (token) => fetchOutlookMessages(token, 50, lastSync),
        'fetchOutlookMessages'
      );
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
          email = await executeWithRetry(
            (token) => fetchGmailMessage(token, messageId),
            `fetchGmailMessage(${messageId})`
          );
        } else if (account.provider === 'outlook') {
          email = await executeWithRetry(
            (token) => fetchOutlookMessage(token, messageId),
            `fetchOutlookMessage(${messageId})`
          );
        }

        // Process all emails, not just those with attachments
        // This allows emails without attachments to still update document request status
        if (email) {
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
          
          if (email.attachments.length === 0) {
            console.log(`Processed email ${email.id} without attachments from ${email.from.email}`);
          }
        }
      } catch (error: any) {
        const errorMessage = error?.message || String(error);
        console.error(`Error processing email ${messageId}:`, errorMessage);
        errors++;
        // Store first few error messages for reporting
        if (errorDetails.length < 3) {
          errorDetails.push(errorMessage);
        }
      }
    }

    // Update last sync time
    await supabase
      .from('email_accounts')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', account.id);

    return { 
      processed, 
      errors, 
      accountId: account.id, 
      accountEmail: account.email,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined
    };
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    console.error(`Error processing email account ${account.id} (${account.email}):`, errorMessage);
    
    // Check if this is a token-related error that couldn't be refreshed
    if (
      errorMessage.includes('401') || 
      errorMessage.includes('expired') || 
      errorMessage.includes('authentication failed') ||
      errorMessage.includes('Token refresh failed') ||
      errorMessage.includes('malformed') ||
      errorMessage.includes('Please reconnect account')
    ) {
      // If refresh was attempted and failed, or token is malformed, mark account as inactive
      if (errorMessage.includes('Token refresh failed') || errorMessage.includes('malformed')) {
        try {
          await supabase
            .from('email_accounts')
            .update({ is_active: false })
            .eq('id', account.id);
          console.log(`⚠️ Account ${account.email} marked as inactive due to token issues. Please reconnect.`);
        } catch (updateError) {
          console.error(`Failed to mark account as inactive:`, updateError);
        }
      }
      
      console.error(`⚠️ Token error for account ${account.email}: ${errorMessage}`);
    }
    
    return { 
      processed, 
      errors: errors + 1, 
      accountId: account.id, 
      accountEmail: account.email,
      errorDetails: [errorMessage]
    };
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
      } catch (error: any) {
        const errorMessage = error?.message || String(error);
        console.error(`Failed to process account ${account.id} (${account.email}):`, errorMessage);
        totalErrors++;
        results.push({
          processed: 0,
          errors: 1,
          accountId: account.id,
          accountEmail: account.email,
          errorDetails: [errorMessage],
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
