import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const ONEDRIVE_REDIRECT_URI = process.env.ONEDRIVE_REDIRECT_URI || 'http://localhost:3000/auth/onedrive/callback';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const storageId = request.nextUrl.searchParams.get('storage_id');
  if (!storageId) {
    return NextResponse.redirect(new URL('/dashboard/storage?error=missing_storage_id', request.url));
  }

  // Build Microsoft OAuth URL for OneDrive scopes
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID!,
    redirect_uri: ONEDRIVE_REDIRECT_URI,
    response_type: 'code',
    scope: 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Files.ReadWrite.All offline_access',
    response_mode: 'query',
    // state includes the user id and storage id for validation in callback
    state: `${user.id}|${storageId}`,
  });

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}


