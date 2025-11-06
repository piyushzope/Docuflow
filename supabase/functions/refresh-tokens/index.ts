// Supabase Edge Function to refresh OAuth tokens
// Scheduled via Supabase Cron jobs (every hour)
// 
// This function:
// 1. Finds email accounts and storage configs with expiring tokens
// 2. Refreshes OAuth tokens for Google and Microsoft
// 3. Updates encrypted tokens in database

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface TokenRefreshResult {
  accountId: string;
  accountEmail: string;
  provider: string;
  success: boolean;
  error?: string;
}

// Simple XOR encryption/decryption (matches @docuflow/shared)
function encrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

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

// Refresh Google OAuth token
async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  
  // Validate required environment variables
  if (!clientId || !clientSecret) {
    throw new Error(
      'Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET secrets in Supabase Edge Functions settings. ' +
      'See FIX_EDGE_FUNCTION_SECRETS.md for instructions.'
    );
  }
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
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
  const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
  const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');
  
  // Validate required environment variables
  if (!clientId || !clientSecret) {
    throw new Error(
      'Microsoft OAuth credentials not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET secrets in Supabase Edge Functions settings. ' +
      'See FIX_EDGE_FUNCTION_SECRETS.md for instructions.'
    );
  }
  
  const tenant = tenantId || 'common';
  const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/.default offline_access',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Microsoft token refresh failed: ${error}`);
  }

  return await response.json();
}

// Refresh tokens for email accounts
async function refreshEmailAccountTokens(
  supabase: any,
  account: any,
  encryptionKey: string
): Promise<TokenRefreshResult> {
  try {
    if (!account.encrypted_refresh_token) {
      return {
        accountId: account.id,
        accountEmail: account.email,
        provider: account.provider,
        success: false,
        error: 'No refresh token available',
      };
    }

    const refreshToken = decrypt(account.encrypted_refresh_token, encryptionKey);
    let newAccessToken: string;
    let newRefreshToken: string | undefined;
    let expiresIn: number;

    if (account.provider === 'gmail') {
      const result = await refreshGoogleToken(refreshToken);
      newAccessToken = result.access_token;
      expiresIn = result.expires_in;
    } else if (account.provider === 'outlook') {
      const result = await refreshMicrosoftToken(refreshToken);
      newAccessToken = result.access_token;
      newRefreshToken = result.refresh_token;
      expiresIn = result.expires_in;
    } else {
      return {
        accountId: account.id,
        accountEmail: account.email,
        provider: account.provider,
        success: false,
        error: `Unsupported provider: ${account.provider}`,
      };
    }

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

    return {
      accountId: account.id,
      accountEmail: account.email,
      provider: account.provider,
      success: true,
    };
  } catch (error: any) {
    return {
      accountId: account.id,
      accountEmail: account.email,
      provider: account.provider,
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

// Refresh tokens for storage configs (OneDrive, Google Drive)
async function refreshStorageConfigTokens(
  supabase: any,
  config: any,
  encryptionKey: string
): Promise<TokenRefreshResult> {
  try {
    const configData = config.config || {};
    const encryptedRefreshToken = configData.encrypted_refresh_token || configData.encryptedRefreshToken;

    if (!encryptedRefreshToken) {
      return {
        accountId: config.id,
        accountEmail: config.name || 'Storage Config',
        provider: config.provider,
        success: false,
        error: 'No refresh token available',
      };
    }

    const refreshToken = decrypt(encryptedRefreshToken, encryptionKey);
    let newAccessToken: string;
    let newRefreshToken: string | undefined;
    let expiresIn: number;

    if (config.provider === 'google_drive') {
      const result = await refreshGoogleToken(refreshToken);
      newAccessToken = result.access_token;
      expiresIn = result.expires_in;
    } else if (config.provider === 'onedrive') {
      const result = await refreshMicrosoftToken(refreshToken);
      newAccessToken = result.access_token;
      newRefreshToken = result.refresh_token;
      expiresIn = result.expires_in;
    } else {
      return {
        accountId: config.id,
        accountEmail: config.name || 'Storage Config',
        provider: config.provider,
        success: false,
        error: `Token refresh not needed for provider: ${config.provider}`,
      };
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Encrypt and update tokens
    const encryptedAccessToken = encrypt(newAccessToken, encryptionKey);
    const updatedConfig = {
      ...configData,
      encrypted_access_token: encryptedAccessToken,
      accessToken: undefined, // Remove plaintext token if exists
      expires_at: expiresAt.toISOString(),
    };

    if (newRefreshToken) {
      updatedConfig.encrypted_refresh_token = encrypt(newRefreshToken, encryptionKey);
      updatedConfig.refreshToken = undefined; // Remove plaintext token if exists
    }

    const { error } = await supabase
      .from('storage_configs')
      .update({
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id);

    if (error) {
      throw error;
    }

    return {
      accountId: config.id,
      accountEmail: config.name || 'Storage Config',
      provider: config.provider,
      success: true,
    };
  } catch (error: any) {
    return {
      accountId: config.id,
      accountEmail: config.name || 'Storage Config',
      provider: config.provider,
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

// Main handler
serve(async (req) => {
  const startTime = Date.now();
  console.log('Token refresh Edge Function started');

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

    // Find email accounts with tokens expiring in the next hour
    const { data: emailAccounts, error: emailError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('is_active', true)
      .not('encrypted_refresh_token', 'is', null)
      .or('expires_at.is.null,expires_at.lt.' + new Date(Date.now() + 60 * 60 * 1000).toISOString());

    if (emailError) {
      console.error('Error fetching email accounts:', emailError);
    }

    // Find storage configs with OAuth tokens that need refresh
    const { data: storageConfigs, error: storageError } = await supabase
      .from('storage_configs')
      .select('*')
      .eq('is_active', true)
      .in('provider', ['google_drive', 'onedrive']);

    if (storageError) {
      console.error('Error fetching storage configs:', storageError);
    }

    const results: TokenRefreshResult[] = [];

    // Refresh email account tokens
    if (emailAccounts && emailAccounts.length > 0) {
      for (const account of emailAccounts) {
        const result = await refreshEmailAccountTokens(supabase, account, encryptionKey);
        results.push(result);
      }
    }

    // Refresh storage config tokens
    if (storageConfigs && storageConfigs.length > 0) {
      for (const config of storageConfigs) {
        const result = await refreshStorageConfigTokens(supabase, config, encryptionKey);
        results.push(result);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;
    const duration = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Token refresh completed',
        refreshed: successCount,
        errors: errorCount,
        results,
        duration_ms: duration,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Token refresh failed:', error);
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
