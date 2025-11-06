import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

  // Verify the storage config exists and belongs to the user's organization
  const { data: storageConfig, error: fetchError } = await supabase
    .from('storage_configs')
    .select('id, organization_id, name, provider')
    .eq('id', storageId)
    .eq('organization_id', profileData.organization_id)
    .single();

  if (fetchError || !storageConfig) {
    return NextResponse.json(
      { error: 'Storage configuration not found' },
      { status: 404 }
    );
  }

  // Soft delete: mark inactive
  const { error } = await supabase
    .from('storage_configs')
    .update({ is_active: false } as any)
    .eq('id', storageId)
    .eq('organization_id', profileData.organization_id);

  if (error) {
    console.error('Error deleting storage config:', error);
    // Provide more specific error message
    const errorMessage = error.code === '42501' || error.message?.includes('policy')
      ? 'Permission denied. Please ensure the UPDATE policy is enabled for storage_configs. Run migration: 20250104000002_allow_users_delete_storage_configs.sql'
      : error.message || 'Failed to delete storage configuration';
    return NextResponse.json(
      { error: errorMessage, details: error },
      { status: 500 }
    );
  }

  // Log activity
  await supabase.from('activity_logs').insert({
    organization_id: profileData.organization_id,
    user_id: user.id,
    action: 'delete',
    resource_type: 'storage_config',
    resource_id: storageId,
    details: {
      name: (storageConfig as any).name,
      provider: (storageConfig as any).provider,
    },
  } as any);

  return NextResponse.json({ ok: true });
}


