import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/**
 * Utility endpoint to clean up and fix profile data issues
 * Can be used by admins to:
 * - Link existing profiles to organizations
 * - Update missing full_name from auth.users
 * - Fix skills array format
 * - Update other missing fields
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
        { error: 'Only administrators can use this utility' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { profileIds, action } = body;

    if (!profileIds || !Array.isArray(profileIds)) {
      return NextResponse.json(
        { error: 'profileIds array is required' },
        { status: 400 }
      );
    }

    // Create admin client for accessing auth.users
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminSupabase = supabaseUrl && supabaseServiceKey
      ? createAdminClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
      : null;

    const results: Array<{
      profileId: string;
      success: boolean;
      message: string;
      updates?: Record<string, any>;
    }> = [];

    for (const profileId of profileIds) {
      try {
        // Get the profile
        const { data: targetProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .single();

        if (fetchError || !targetProfile) {
          results.push({
            profileId,
            success: false,
            message: 'Profile not found',
          });
          continue;
        }

        const updates: Record<string, any> = {};

        // Action: Link to organization
        if (action === 'link_organization' || !action) {
          if (!targetProfile.organization_id) {
            updates.organization_id = profile.organization_id;
          }
        }

        // Action: Fix missing full_name from auth.users
        if (action === 'fix_full_name' || action === 'fix_all' || !action) {
          if (!targetProfile.full_name && adminSupabase) {
            try {
              const { data: authUser } = await adminSupabase.auth.admin.getUserById(profileId);
              if (authUser?.user?.user_metadata?.full_name) {
                updates.full_name = authUser.user.user_metadata.full_name;
              } else if (authUser?.user?.email) {
                // Use email username as fallback
                const emailName = authUser.user.email.split('@')[0];
                updates.full_name = emailName.replace(/[._]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
              }
            } catch (authError) {
              console.warn(`Could not fetch auth user for ${profileId}:`, authError);
            }
          }
        }

        // Action: Fix skills format (convert string "[]" to proper JSONB null or array)
        if (action === 'fix_skills' || action === 'fix_all' || !action) {
          if (targetProfile.skills === '[]' || targetProfile.skills === '""') {
            updates.skills = null;
          } else if (typeof targetProfile.skills === 'string') {
            try {
              const parsed = JSON.parse(targetProfile.skills);
              updates.skills = Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
            } catch {
              updates.skills = null;
            }
          }
        }

        // Action: Set default role if missing
        if (action === 'fix_role' || action === 'fix_all' || !action) {
          if (!targetProfile.role) {
            updates.role = 'member';
          }
        }

        // Only update if there are changes
        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', profileId);

          if (updateError) {
            results.push({
              profileId,
              success: false,
              message: `Update failed: ${updateError.message}`,
            });
            continue;
          }

          // Log activity
          await supabase.from('activity_logs').insert({
            organization_id: profile.organization_id,
            user_id: user.id,
            action: 'update',
            resource_type: 'profile',
            resource_id: profileId,
            details: {
              action: 'profile_cleanup',
              updates,
            },
          });

          results.push({
            profileId,
            success: true,
            message: 'Profile updated successfully',
            updates,
          });
        } else {
          results.push({
            profileId,
            success: true,
            message: 'No updates needed',
          });
        }
      } catch (error: any) {
        results.push({
          profileId,
          success: false,
          message: error.message || 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    });
  } catch (error: any) {
    console.error('Error in profile cleanup:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cleanup profiles' },
      { status: 500 }
    );
  }
}

