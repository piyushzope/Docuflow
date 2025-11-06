import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Utility endpoint to list profiles without organization_id
 * Helpful for finding profiles that need to be linked to organizations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization and check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'You must be part of an organization to use this utility' },
        { status: 403 }
      );
    }

    // Check if user has permission (admin or owner)
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can view this list' },
        { status: 403 }
      );
    }

    // Get all profiles without organization_id
    const { data: unlinkedProfiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at, updated_at')
      .is('organization_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Also get profiles with missing full_name
    const { data: missingNameProfiles, error: nameError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, organization_id, created_at')
      .is('full_name', null)
      .order('created_at', { ascending: false });

    if (nameError) {
      console.warn('Error fetching profiles with missing names:', nameError);
    }

    return NextResponse.json({
      success: true,
      unlinkedProfiles: unlinkedProfiles || [],
      missingNameProfiles: missingNameProfiles || [],
      summary: {
        unlinkedCount: unlinkedProfiles?.length || 0,
        missingNameCount: missingNameProfiles?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Error listing unlinked profiles:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list profiles' },
      { status: 500 }
    );
  }
}

