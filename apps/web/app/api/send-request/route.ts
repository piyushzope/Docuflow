import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createEmailClient } from '@docuflow/email-integrations';
import { decrypt, encrypt } from '@docuflow/shared';

/**
 * Validate JWT token format (should have dots: header.payload.signature)
 */
function validateTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    console.warn('Token validation failed: token is not a string or is null/undefined');
    return false;
  }
  
  // Basic validation: must be a non-empty string
  if (token.trim().length === 0) {
    console.warn('Token validation failed: token is empty');
    return false;
  }
  
  // JWT tokens should have at least 2 dots (header.payload.signature)
  const parts = token.split('.');
  const hasJwtFormat = parts.length >= 2;
  
  // Log token details for debugging
  console.log('Token validation:', {
    length: token.length,
    hasJwtFormat,
    dotCount: parts.length - 1,
    firstPartLength: parts[0]?.length || 0,
    preview: token.substring(0, 50) + '...',
  });
  
  // Microsoft tokens should be JWTs, but if they're long enough, we'll accept them
  // This is a temporary workaround to see what Microsoft is actually returning
  if (!hasJwtFormat) {
    console.warn('Token does not have JWT format (expected dots, got', parts.length - 1, 'dots)');
    // If token is very long (>500 chars), it might still be valid even without dots
    // This shouldn't happen with Microsoft, but let's be lenient for debugging
    if (token.length > 500) {
      console.warn('Allowing non-JWT token due to length:', token.length);
      return true; // Temporarily allow for debugging
    }
    return false;
  }
  
  return true;
}

/**
 * Check if token is expired or about to expire (within 5 minutes)
 */
function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  const expirationTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const fiveMinutesFromNow = now + 5 * 60 * 1000; // 5 minutes buffer
  return expirationTime <= fiveMinutesFromNow;
}

/**
 * Refresh Google OAuth token
 */
async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
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

/**
 * Refresh Microsoft OAuth token
 */
async function refreshMicrosoftToken(
  refreshToken: string,
  tenantId?: string
): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
  const tenant = tenantId || 'common';
  const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID || '',
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/.default offline_access',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Microsoft token refresh HTTP error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(`Microsoft token refresh failed: ${errorText}`);
  }

  const result = await response.json();
  
  // Log response for debugging
  console.log('Microsoft token refresh response:', {
    hasAccessToken: !!result.access_token,
    accessTokenLength: result.access_token?.length,
    hasRefreshToken: !!result.refresh_token,
    expiresIn: result.expires_in,
    tokenType: result.token_type,
    error: result.error,
    errorDescription: result.error_description,
  });
  
  // Validate response structure
  if (!result.access_token) {
    console.error('Microsoft response missing access_token:', result);
    throw new Error(`Microsoft token refresh returned invalid response: ${JSON.stringify(result)}`);
  }

  return result;
}

/**
 * Refresh email account tokens and update database
 */
async function refreshAccountTokens(
  supabase: Awaited<ReturnType<typeof createClient>>,
  account: any
): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  try {
    if (!account.encrypted_refresh_token) {
      return {
        success: false,
        error: 'No refresh token available',
      };
    }

    const refreshToken = decrypt(account.encrypted_refresh_token);
    let newAccessToken: string;
    let newRefreshToken: string | undefined;
    let expiresIn: number;

    if (account.provider === 'gmail') {
      const result = await refreshGoogleToken(refreshToken);
      newAccessToken = result.access_token;
      expiresIn = result.expires_in;
    } else if (account.provider === 'outlook') {
      const result = await refreshMicrosoftToken(refreshToken);
      
      // Validate Microsoft response
      if (!result || !result.access_token) {
        console.error('Microsoft token refresh returned invalid response:', result);
        return {
          success: false,
          error: 'Microsoft token refresh returned invalid response. Please reconnect your email account in Integrations.',
        };
      }
      
      newAccessToken = result.access_token;
      newRefreshToken = result.refresh_token;
      expiresIn = result.expires_in;
      
      // Log token details for debugging
      console.log(`🔄 Microsoft token refresh for ${account.email}:`, {
        hasAccessToken: !!newAccessToken,
        tokenLength: newAccessToken?.length,
        hasRefreshToken: !!newRefreshToken,
        expiresIn,
      });
    } else {
      return {
        success: false,
        error: `Unsupported provider: ${account.provider}`,
      };
    }

    // Validate new token format
    if (!validateTokenFormat(newAccessToken)) {
      console.error(`❌ Refreshed token validation failed for account ${account.email}`);
      console.error(`Token length: ${newAccessToken?.length || 0}`);
      console.error(`Token preview: ${newAccessToken?.substring(0, 50) || 'null'}...`);
      console.error(`Token has dots: ${(newAccessToken?.split('.').length || 0) >= 2}`);
      
      // Log the actual response from Microsoft for debugging
      console.error('Microsoft refresh response:', {
        hasAccessToken: !!newAccessToken,
        tokenType: typeof newAccessToken,
        expiresIn,
        hasRefreshToken: !!newRefreshToken,
      });
      
      return {
        success: false,
        error: `Refreshed token format validation failed. Please reconnect your email account in Integrations.`,
      };
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Encrypt and update tokens
    const encryptedAccessToken = encrypt(newAccessToken);
    const updateData: any = {
      encrypted_access_token: encryptedAccessToken,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (newRefreshToken) {
      updateData.encrypted_refresh_token = encrypt(newRefreshToken);
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
    console.error(`❌ Token refresh failed for account ${account.email}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Helper function to send email for a document request
 * Includes automatic token refresh on expiration/invalid tokens
 */
async function sendRequestEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  docRequest: any,
  organizationId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  let emailAccount: any = null;
  let accessToken: string | null = null;
  
  try {
    // Get email account - try from request first, then fallback to any active account
    if (docRequest.email_account_id) {
      const { data: account } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('id', docRequest.email_account_id)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();
      
      if (account) {
        emailAccount = account;
      }
    }

    // Fallback: get any active email account for the organization
    if (!emailAccount) {
      const { data: accounts } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .limit(1);
      
      if (accounts && accounts.length > 0) {
        emailAccount = accounts[0];
        
        // Update the request with the email account ID
        await supabase
          .from('document_requests')
          .update({ email_account_id: emailAccount.id })
          .eq('id', docRequest.id);
      }
    }

    if (!emailAccount) {
      return {
        success: false,
        error: 'No active email account found. Please connect an email account in Integrations.',
      };
    }

    // Decrypt and validate token
    accessToken = decrypt(emailAccount.encrypted_access_token);
    
    // Validate token format immediately after decryption
    if (!validateTokenFormat(accessToken)) {
      console.warn(`⚠️ Token format invalid for account ${emailAccount.email}, attempting refresh...`);
      
      // Attempt to refresh if token is malformed
      const refreshResult = await refreshAccountTokens(supabase, emailAccount);
      if (refreshResult.success && refreshResult.accessToken) {
        accessToken = refreshResult.accessToken;
        // Reload account to get updated token
        const { data: updatedAccount } = await supabase
          .from('email_accounts')
          .select('*')
          .eq('id', emailAccount.id)
          .single();
        if (updatedAccount) {
          emailAccount = updatedAccount;
          accessToken = decrypt(updatedAccount.encrypted_access_token);
        }
        console.log(`✅ Token refreshed successfully for account ${emailAccount.email}`);
      } else {
        return {
          success: false,
          error: `Token is malformed and refresh failed: ${refreshResult.error || 'Unknown error'}. Please reconnect your email account in Integrations.`,
        };
      }
    }

    // Check if token is expired or about to expire
    if (isTokenExpired(emailAccount.expires_at)) {
      console.log(`🔄 Token expired or expiring soon for account ${emailAccount.email}, refreshing...`);
      
      const refreshResult = await refreshAccountTokens(supabase, emailAccount);
      if (refreshResult.success && refreshResult.accessToken) {
        accessToken = refreshResult.accessToken;
        // Reload account to get updated expiration
        const { data: updatedAccount } = await supabase
          .from('email_accounts')
          .select('*')
          .eq('id', emailAccount.id)
          .single();
        if (updatedAccount) {
          emailAccount = updatedAccount;
          accessToken = decrypt(updatedAccount.encrypted_access_token);
        }
        console.log(`✅ Token refreshed successfully for account ${emailAccount.email}`);
      } else {
        return {
          success: false,
          error: `Token expired and refresh failed: ${refreshResult.error || 'Unknown error'}. Please reconnect your email account in Integrations.`,
        };
      }
    }

    const refreshToken = emailAccount.encrypted_refresh_token
      ? decrypt(emailAccount.encrypted_refresh_token)
      : undefined;

    // Helper function to send email with retry on 401
    const sendEmailWithRetry = async (token: string): Promise<void> => {
      const emailClient = createEmailClient({
        provider: emailAccount.provider,
        email: emailAccount.email,
        accessToken: token,
        refreshToken,
        expiresAt: emailAccount.expires_at ? new Date(emailAccount.expires_at) : undefined,
      });

      await emailClient.sendEmail({
        to: [docRequest.recipient_email],
        subject: docRequest.subject,
        body: docRequest.message_body || '',
      });
    };

    // Attempt to send email
    try {
      await sendEmailWithRetry(accessToken);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      
      // Check if this is a 401 authentication error
      if (errorMessage.includes('401') || 
          errorMessage.includes('authentication failed') || 
          errorMessage.includes('expired') ||
          errorMessage.includes('JWT') ||
          errorMessage.includes('IDX14100') ||
          errorMessage.includes('well formed')) {
        console.log(`🔄 401 error detected, attempting token refresh...`);
        
        // Attempt to refresh token
        const refreshResult = await refreshAccountTokens(supabase, emailAccount);
        
        if (refreshResult.success && refreshResult.accessToken) {
          // Reload account to get updated token
          const { data: updatedAccount } = await supabase
            .from('email_accounts')
            .select('*')
            .eq('id', emailAccount.id)
            .single();
          if (updatedAccount) {
            emailAccount = updatedAccount;
            accessToken = decrypt(updatedAccount.encrypted_access_token);
          }
          
          console.log(`✅ Token refreshed, retrying email send...`);
          
          // Retry the email send with new token
          try {
            await sendEmailWithRetry(accessToken);
          } catch (retryError: any) {
            const retryErrorMessage = retryError?.message || String(retryError);
            throw new Error(`Email send failed after token refresh: ${retryErrorMessage}`);
          }
        } else {
          // Refresh failed - mark account as needing reconnection
          await supabase
            .from('email_accounts')
            .update({ is_active: false })
            .eq('id', emailAccount.id);
          
          const refreshErrorMsg = `Token refresh failed: ${refreshResult.error || 'Unknown error'}. Please reconnect your email account in Integrations.`;
          console.error(`❌ ${refreshErrorMsg}`);
          return {
            success: false,
            error: refreshErrorMsg,
          };
        }
      } else {
        // Re-throw non-401 errors
        throw error;
      }
    }

    // Update request status (status history will be logged automatically by trigger)
    await supabase
      .from('document_requests')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        status_changed_by: userId || null, // Track who sent it
        updated_at: new Date().toISOString(),
      })
      .eq('id', docRequest.id);

    return { success: true };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user with better error handling
    let user;
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error('Auth error:', authError);
        // Check for JWT errors (including IDX14100)
        const isJwtError = 
          authError.message?.includes('JWT') || 
          authError.message?.includes('token') ||
          authError.message?.includes('IDX14100') ||
          authError.message?.includes('well formed');
        
        if (isJwtError) {
          return NextResponse.json(
            { 
              error: 'Authentication session expired. Please log in again.',
              code: 'SESSION_EXPIRED'
            },
            { status: 401 }
          );
        }
        return NextResponse.json(
          { error: 'Authentication failed. Please log in again.' },
          { status: 401 }
        );
      }

      user = authUser;
    } catch (error: any) {
      console.error('Error getting user:', error);
      // Check for JWT errors in catch block too
      const isJwtError = 
        error.message?.includes('JWT') || 
        error.message?.includes('token') ||
        error.message?.includes('IDX14100') ||
        error.message?.includes('well formed');
      
      return NextResponse.json(
        { 
          error: 'Authentication error. Please log in again.',
          code: isJwtError ? 'SESSION_EXPIRED' : 'AUTH_ERROR',
          details: isJwtError ? 'Session token invalid or expired' : error.message
        },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to continue.' },
        { status: 401 }
      );
    }

    // Parse form data
    let formData: FormData;
    let requestId: string;
    
    try {
      formData = await request.formData();
      requestId = formData.get('requestId') as string;
    } catch (error: any) {
      console.error('Error parsing form data:', error);
      return NextResponse.json({ 
        error: 'Invalid request format',
        details: error.message 
      }, { status: 400 });
    }

    if (!requestId) {
      console.error('Request ID missing from form data');
      return NextResponse.json({ 
        error: 'Request ID required',
        details: 'The requestId parameter is missing from the request'
      }, { status: 400 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 403 });
    }

    // Get document request
    const { data: docRequest, error: requestError } = await supabase
      .from('document_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !docRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (profile.organization_id !== docRequest.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Send email using helper function
    const emailResult = await sendRequestEmail(supabase, docRequest, profile.organization_id, user.id);

    if (!emailResult.success) {
      console.error('Failed to send request email:', {
        requestId,
        error: emailResult.error,
        recipient: docRequest.recipient_email,
        organizationId: profile.organization_id,
      });
      return NextResponse.json({ 
        error: emailResult.error || 'Failed to send email',
        details: emailResult.error 
      }, { status: 400 });
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      organization_id: docRequest.organization_id,
      user_id: user.id,
      action: 'send',
      resource_type: 'document_request',
      resource_id: requestId,
      details: {
        recipient: docRequest.recipient_email,
        subject: docRequest.subject,
      },
    });

    // Check if this is a fetch call (Accept: application/json) or form submission
    const acceptHeader = request.headers.get('accept') || '';
    const prefersJson = acceptHeader.includes('application/json');
    
    if (prefersJson) {
      // For fetch calls, return JSON with redirect URL
      return NextResponse.json({ 
        success: true,
        redirectUrl: `/dashboard/requests?success=sent`
      });
    } else {
      // For form submissions, redirect
      return NextResponse.redirect(
        new URL(`/dashboard/requests?success=sent`, request.url)
      );
    }
  } catch (error: any) {
    console.error('Error sending request:', error);
    
    // Check if this is a fetch call or form submission
    const acceptHeader = request.headers.get('accept') || '';
    const prefersJson = acceptHeader.includes('application/json');
    
    if (prefersJson) {
      // For fetch calls, return JSON error
      return NextResponse.json(
        { error: error.message || 'Failed to send request' },
        { status: 500 }
      );
    } else {
      // For form submissions, redirect with error
      return NextResponse.redirect(
        new URL(`/dashboard/requests?error=${encodeURIComponent(error.message)}`, request.url)
      );
    }
  }
}