import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const ONEDRIVE_REDIRECT_URI = process.env.ONEDRIVE_REDIRECT_URI || 'http://localhost:3000/auth/onedrive/callback';

export async function GET(request: NextRequest) {
  // Validate environment variables early
  if (!MICROSOFT_CLIENT_ID) {
    console.error('OneDrive OAuth: MICROSOFT_CLIENT_ID is not set');
    return NextResponse.redirect(
      new URL('/dashboard/storage?error=oauth_failed&details=' + encodeURIComponent('Microsoft OAuth client ID is not configured. Please set MICROSOFT_CLIENT_ID environment variable.'), request.url)
    );
  }

  if (!MICROSOFT_CLIENT_SECRET) {
    console.error('OneDrive OAuth: MICROSOFT_CLIENT_SECRET is not set');
    return NextResponse.redirect(
      new URL('/dashboard/storage?error=oauth_failed&details=' + encodeURIComponent('Microsoft OAuth client secret is not configured. Please set MICROSOFT_CLIENT_SECRET environment variable.'), request.url)
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // expected: `${userId}|${storageId}`
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Extract storageId from state early for error redirects
  let storageId: string | undefined;
  if (state) {
    const [stateUserId, extractedStorageId] = state.split('|');
    if (stateUserId === user.id && extractedStorageId) {
      storageId = extractedStorageId;
    }
  }

  // Check if Microsoft returned an error
  if (errorParam) {
    console.error('OneDrive OAuth error from Microsoft:', errorParam, errorDescription);
    const storageIdParam = storageId ? `&storage_id=${storageId}&provider=onedrive` : '';
    return NextResponse.redirect(
      new URL(`/dashboard/storage?error=oauth_failed&details=${encodeURIComponent(errorDescription || errorParam)}${storageIdParam}`, request.url)
    );
  }

  if (!code || !state) {
    console.error('OneDrive OAuth: Missing code or state parameter', { code: !!code, state: !!state });
    const storageIdParam = storageId ? `&storage_id=${storageId}&provider=onedrive` : '';
    return NextResponse.redirect(
      new URL(`/dashboard/storage?error=invalid_code&details=${encodeURIComponent('Missing authorization code or state parameter')}${storageIdParam}`, request.url)
    );
  }

  const [stateUserId, extractedStorageId] = state.split('|');
  if (stateUserId !== user.id || !extractedStorageId) {
    const storageIdParam = extractedStorageId ? `&storage_id=${extractedStorageId}&provider=onedrive` : '';
    return NextResponse.redirect(
      new URL(`/dashboard/storage?error=invalid_state${storageIdParam}`, request.url)
    );
  }
  
  storageId = extractedStorageId;

  try {
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID!,
        client_secret: MICROSOFT_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: ONEDRIVE_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('OneDrive token exchange error:', errorText);
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokens = await tokenResponse.json();
    if (!tokens.access_token) {
      console.error('OneDrive: missing access token:', tokens);
      throw new Error('No access token received from Microsoft');
    }

    // Get user's account information from Microsoft Graph API
    let accountEmail: string | undefined;
    let accountDisplayName: string | undefined;
    try {
      const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        accountEmail = profile.mail || profile.userPrincipalName;
        accountDisplayName = profile.displayName || profile.givenName || accountEmail;
        console.log('OneDrive: fetched account info:', { email: accountEmail, displayName: accountDisplayName });
      } else {
        console.warn('OneDrive: failed to fetch account info:', profileResponse.status);
      }
    } catch (error) {
      console.warn('OneDrive: error fetching account info:', error);
      // Continue without account info - not critical
    }

    // Import encryption lazily
    let encrypt: (text: string) => string;
    try {
      const encryptionModule = await import('@docuflow/shared');
      encrypt = encryptionModule.encrypt;
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const encryptionModule = require('@docuflow/shared');
      encrypt = encryptionModule.encrypt;
    }

    if (!process.env.ENCRYPTION_KEY && !process.env.NEXT_PUBLIC_ENCRYPTION_KEY) {
      console.error('ENCRYPTION_KEY is not set for OneDrive callback');
      return NextResponse.redirect(
        new URL('/dashboard/storage?error=oauth_failed&details=' + encodeURIComponent('Encryption key not configured. Please set ENCRYPTION_KEY environment variable.'), request.url)
      );
    }

    // Validate storage belongs to user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.redirect(
        new URL('/dashboard/organization', request.url)
      );
    }

    // Find storage config - include inactive ones since we're connecting it
    // Remove the is_active filter to allow connecting inactive configs
    const { data: storageConfig, error: fetchError } = await supabase
      .from('storage_configs')
      .select('*')
      .eq('id', storageId)
      .eq('organization_id', profile.organization_id)
      .maybeSingle();

    if (fetchError) {
      console.error('OneDrive: storage config fetch error:', fetchError);
      return NextResponse.redirect(
        new URL(`/dashboard/storage?error=storage_not_found&details=${encodeURIComponent(fetchError.message || 'Failed to fetch storage configuration')}&storage_id=${storageId}&provider=onedrive`, request.url)
      );
    }

    if (!storageConfig) {
      console.error('OneDrive: storage config not found', { storageId, organizationId: profile.organization_id });
      return NextResponse.redirect(
        new URL(`/dashboard/storage?error=storage_not_found&details=${encodeURIComponent('Storage configuration not found. It may have been deleted.')}&storage_id=${storageId}&provider=onedrive`, request.url)
      );
    }

    // Merge tokens and account info into existing config
    const existingConfig = (storageConfig as any).config || {};
    const updatedConfig = {
      ...existingConfig,
      encrypted_access_token: encrypt(tokens.access_token),
      encrypted_refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
      // Store account info for display (not encrypted - just metadata)
      account_email: accountEmail,
      account_display_name: accountDisplayName,
      connected_at: new Date().toISOString(),
    };

    // Update storage config: activate it, set as default, and save tokens
    const updatePayload: any = {
      config: updatedConfig,
      is_active: true, // Activate when tokens are added
      is_default: true, // Set as default for the organization
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('storage_configs')
      .update(updatePayload)
      .eq('id', storageId)
      .eq('organization_id', profile.organization_id)
      .select();

    if (updateError) {
      console.error('OneDrive: failed to update storage config:', {
        error: updateError,
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        storageId,
        organizationId: profile.organization_id,
      });
      
      // Provide more specific error message
      let errorMessage = updateError.message || 'Failed to save storage configuration';
      if (updateError.code === '42501' || updateError.message?.includes('policy')) {
        errorMessage = 'Permission denied. The UPDATE policy for storage_configs is not enabled. Please run the migration: 20250104000002_allow_users_delete_storage_configs.sql';
      } else if (updateError.code === '23502' || updateError.message?.includes('not-null')) {
        errorMessage = 'Database constraint error. A required field is missing. Check server logs for details.';
      } else if (updateError.code === 'PGRST116') {
        errorMessage = 'Storage configuration not found or you do not have permission to update it.';
      }
      
      return NextResponse.redirect(
        new URL(`/dashboard/storage?error=store_failed&details=${encodeURIComponent(errorMessage)}&storage_id=${storageId}&provider=onedrive`, request.url)
      );
    }

    // Remap routing rules from old OneDrive configs to the new one
    // and deactivate old OneDrive configs (handled atomically by the SQL function)
    const { data: remapResult, error: remapError } = await supabase.rpc(
      'remap_onedrive_storage_config',
      {
        org_id: profile.organization_id,
        new_config_id: storageId,
      }
    );

    if (remapError) {
      console.error('OneDrive: failed to remap storage configs:', {
        error: remapError,
        storageId,
        organizationId: profile.organization_id,
      });
      // Log but don't fail - the new config is already set up
      // User can manually remap rules if needed
    } else if (remapResult && remapResult.length > 0) {
      const result = remapResult[0];
      console.log('OneDrive: storage config remapping completed:', {
        rules_updated: result.rules_updated || 0,
        old_configs_deactivated: result.old_configs_deactivated || 0,
        new_config_id: storageId,
        organization_id: profile.organization_id,
      });
    }

    return NextResponse.redirect(
      new URL('/dashboard/storage?success=onedrive_connected', request.url)
    );
  } catch (error: any) {
    console.error('Error in OneDrive OAuth callback:', error);
    const msg = encodeURIComponent(error?.message || 'Unknown error');
    const storageIdParam = typeof storageId !== 'undefined' ? `&storage_id=${storageId}&provider=onedrive` : '';
    return NextResponse.redirect(
      new URL(`/dashboard/storage?error=oauth_failed&details=${msg}${storageIdParam}`, request.url)
    );
  }
}


