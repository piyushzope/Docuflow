import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@docuflow/shared';

/**
 * API endpoint to fetch and update account information for storage configs
 * This is useful for existing configs that were connected before account info was stored
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // Get storage config
  const { data: storageConfig, error: configError } = await supabase
    .from('storage_configs')
    .select('*')
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .single();

  if (configError || !storageConfig) {
    return NextResponse.json({ error: 'Storage config not found' }, { status: 404 });
  }

  const config = (storageConfig as any).config || {};
  
  // Only support OneDrive and Google Drive for now
  if (storageConfig.provider !== 'onedrive' && storageConfig.provider !== 'google_drive') {
    return NextResponse.json(
      { error: 'Account info fetching not supported for this provider' },
      { status: 400 }
    );
  }

  // Get access token
  let accessToken: string | undefined;
  if (config.encrypted_access_token) {
    accessToken = decrypt(config.encrypted_access_token as string);
  } else if (config.accessToken) {
    accessToken = config.accessToken;
  }

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Access token not found. Please reconnect the storage account.' },
      { status: 400 }
    );
  }

  try {
    let accountEmail: string | undefined;
    let accountDisplayName: string | undefined;

    if (storageConfig.provider === 'onedrive') {
      // Fetch account info from Microsoft Graph API
      const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        accountEmail = profile.mail || profile.userPrincipalName;
        accountDisplayName = profile.displayName || profile.givenName || accountEmail;
      } else {
        return NextResponse.json(
          { error: 'Failed to fetch account info from Microsoft' },
          { status: profileResponse.status }
        );
      }
    } else if (storageConfig.provider === 'google_drive') {
      // Fetch account info from Google API
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        accountEmail = profile.email;
        accountDisplayName = profile.name || profile.email;
      } else {
        return NextResponse.json(
          { error: 'Failed to fetch account info from Google' },
          { status: profileResponse.status }
        );
      }
    }

    // Update config with account info
    const updatedConfig = {
      ...config,
      account_email: accountEmail,
      account_display_name: accountDisplayName,
      connected_at: config.connected_at || new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('storage_configs')
      .update({
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', profile.organization_id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update storage config', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      account_email: accountEmail,
      account_display_name: accountDisplayName,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch account info', details: error.message },
      { status: 500 }
    );
  }
}

