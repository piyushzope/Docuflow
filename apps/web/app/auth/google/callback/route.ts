import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';

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
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange token');
    }

    const tokens = await tokenResponse.json();

    // Get user's email from Google
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      throw new Error('Failed to get user profile');
    }

    const profile = await profileResponse.json();

    // Encrypt tokens before storing
    const { encrypt } = require('@docuflow/shared');

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

    const { error: insertError } = await supabase
      .from('email_accounts')
      .upsert({
        organization_id: userProfile.organization_id,
        provider: 'gmail',
        email: profile.email,
        encrypted_access_token: encrypt(tokens.access_token),
        encrypted_refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
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
      new URL('/dashboard/integrations?success=gmail_connected', request.url)
    );
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=oauth_failed', request.url)
    );
  }
}
