import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/auth/microsoft/callback';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // Should be user.id

  if (!code || state !== user.id) {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=invalid_code', request.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID!,
        client_secret: MICROSOFT_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: MICROSOFT_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange error:', errorText);
      console.error('Request details:', {
        client_id: MICROSOFT_CLIENT_ID ? 'Set' : 'Missing',
        redirect_uri: MICROSOFT_REDIRECT_URI,
        has_code: !!code,
      });
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokens = await tokenResponse.json();
    
    // Check if we got the required tokens
    if (!tokens.access_token) {
      console.error('No access token in response:', tokens);
      throw new Error('No access token received from Microsoft');
    }

    // Get user's email from Microsoft Graph
    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      let errorMessage = 'Failed to get user profile';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = `Failed to get user profile: ${errorData.error?.message || errorText}`;
        console.error('Microsoft Graph API error:', errorData);
      } catch {
        console.error('Microsoft Graph API error response:', errorText);
        errorMessage = `Failed to get user profile: ${errorText}`;
      }
      
      console.error('Profile fetch details:', {
        status: profileResponse.status,
        statusText: profileResponse.statusText,
        hasAccessToken: !!tokens.access_token,
        tokenType: tokens.token_type,
      });
      
      throw new Error(errorMessage);
    }

    const profile = await profileResponse.json();
    
    // Log successful profile fetch (without sensitive data)
    console.log('Successfully retrieved Microsoft profile:', {
      email: profile.mail || profile.userPrincipalName,
      displayName: profile.displayName,
      id: profile.id,
    });

    // Encrypt tokens before storing
    // Use dynamic import to avoid issues with require in Next.js
    let encrypt: (text: string) => string;
    try {
      const encryptionModule = await import('@docuflow/shared');
      encrypt = encryptionModule.encrypt;
    } catch (importError) {
      console.error('Failed to import encryption module:', importError);
      // Fallback to require for compatibility
      const encryptionModule = require('@docuflow/shared');
      encrypt = encryptionModule.encrypt;
    }
    
    // Verify encryption key is set
    if (!process.env.ENCRYPTION_KEY && !process.env.NEXT_PUBLIC_ENCRYPTION_KEY) {
      console.error('ENCRYPTION_KEY is not set in environment variables');
      throw new Error('Encryption key not configured');
    }

    // Get user's organization
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userProfile?.organization_id) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=no_organization', request.url)
      );
    }

    // Store email account
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Prepare email account data
    const email = profile.mail || profile.userPrincipalName;
    if (!email) {
      console.error('No email found in profile:', profile);
      throw new Error('No email address found in Microsoft profile');
    }

    let encryptedAccessToken: string;
    let encryptedRefreshToken: string | null = null;
    
    try {
      encryptedAccessToken = encrypt(tokens.access_token);
      if (tokens.refresh_token) {
        encryptedRefreshToken = encrypt(tokens.refresh_token);
      }
    } catch (encryptError) {
      console.error('Encryption error:', encryptError);
      throw new Error('Failed to encrypt tokens');
    }

    const { error: insertError } = await supabase
      .from('email_accounts')
      .upsert({
        organization_id: userProfile.organization_id,
        provider: 'outlook',
        email: email,
        encrypted_access_token: encryptedAccessToken,
        encrypted_refresh_token: encryptedRefreshToken,
        expires_at: expiresAt,
        is_active: true,
      }, {
        onConflict: 'organization_id,email',
      });

    if (insertError) {
      console.error('Error storing email account:', insertError);
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=store_failed', request.url)
      );
    }

    return NextResponse.redirect(
      new URL('/dashboard/integrations?success=outlook_connected', request.url)
    );
  } catch (error: any) {
    console.error('Error in Microsoft OAuth callback:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      clientId: MICROSOFT_CLIENT_ID ? 'Set' : 'Missing',
      clientSecret: MICROSOFT_CLIENT_SECRET ? 'Set' : 'Missing',
      redirectUri: MICROSOFT_REDIRECT_URI,
    });
    
    // Return more specific error
    const errorMessage = error?.message || 'Unknown error';
    return NextResponse.redirect(
      new URL(`/dashboard/integrations?error=oauth_failed&details=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
