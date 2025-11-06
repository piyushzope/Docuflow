import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createStorageAdapter } from '@docuflow/storage-adapters';
import { decrypt } from '@docuflow/shared';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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

  const profileData = profile as any;
  if (!profileData?.organization_id) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 });
  }

  // Handle async params (Next.js 15)
  const resolvedParams = await Promise.resolve(params);
  const storageId = resolvedParams.id;

  // Fetch storage config (scoped to org)
  const { data: storageConfig, error } = await supabase
    .from('storage_configs')
    .select('*')
    .eq('id', storageId)
    .eq('organization_id', profileData.organization_id)
    .single();

  if (error || !storageConfig) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const storage = storageConfig as any;
    const config = storage.config || {};

    // Build adapter config based on provider
    let adapterConfig: any = { provider: storage.provider, ...config };

    if (storage.provider === 'onedrive') {
      if (config.encrypted_access_token) {
        adapterConfig.accessToken = decrypt(config.encrypted_access_token as string);
      }
      if (config.encrypted_refresh_token) {
        adapterConfig.refreshToken = decrypt(config.encrypted_refresh_token as string);
      }
    }

    if (storage.provider === 'google_drive') {
      if (config.encrypted_access_token) {
        adapterConfig.accessToken = decrypt(config.encrypted_access_token as string);
      }
      if (config.encrypted_refresh_token) {
        adapterConfig.refreshToken = decrypt(config.encrypted_refresh_token as string);
      }
    }

    if (storage.provider === 'supabase') {
      adapterConfig.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      adapterConfig.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!adapterConfig.bucket) {
        adapterConfig.bucket = 'documents';
      }
    }

    const adapter = createStorageAdapter(adapterConfig);
    const ok = await adapter.testConnection();

    return NextResponse.json({ ok });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Test failed' }, { status: 500 });
  }
}


