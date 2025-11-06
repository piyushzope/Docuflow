import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API endpoint to manually link organization to profile
 * This is a backup in case client-side update fails
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    // Verify organization exists
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Use database function to bypass RLS
    const { data: result, error: functionError } = await supabase.rpc(
      'link_user_to_organization',
      { p_organization_id: organizationId }
    );

    if (functionError) {
      console.error('Function error:', functionError);
      return NextResponse.json(
        { error: `Failed to link organization: ${functionError.message}` },
        { status: 500 }
      );
    }

    if (!result || !result.success) {
      return NextResponse.json(
        { error: result?.error || 'Profile update verification failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      organizationId: result.organization_id 
    });
  } catch (error: any) {
    console.error('Error linking organization:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to link organization' },
      { status: 500 }
    );
  }
}
