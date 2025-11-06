import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const {
      id,
      full_name,
      job_title,
      department,
      team,
      phone,
      avatar_url,
      skills,
      bio,
      location,
      role, // Allow role editing by admins
    } = body || {};

    if (!id) {
      return NextResponse.json({ error: 'Profile id required' }, { status: 400 });
    }

    // Viewer profile
    const { data: viewerProfile, error: viewerErr } = await supabase
      .from('profiles')
      .select('id, organization_id, role')
      .eq('id', user.id)
      .single();
    if (viewerErr || !viewerProfile) {
      return NextResponse.json({ error: 'Viewer profile not found' }, { status: 403 });
    }

    // Target profile
    const { data: target, error: targetErr } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('id', id)
      .single();
    if (targetErr || !target) {
      return NextResponse.json({ error: 'Target profile not found' }, { status: 404 });
    }

    if (target.organization_id !== viewerProfile.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check permissions: users can edit themselves, admins can edit anyone in their org
    const isSelf = user.id === id;
    const isAdmin = viewerProfile.role === 'owner' || viewerProfile.role === 'admin';
    
    if (!isSelf && !isAdmin) {
      return NextResponse.json({ error: 'Only users can edit their own profile, or administrators can edit any profile' }, { status: 403 });
    }

    // If admin is editing someone else, use the SECURITY DEFINER function
    if (!isSelf && isAdmin) {
      // Parse skills properly
      let skillsJsonb = null;
      if (skills !== undefined) {
        try {
          if (Array.isArray(skills)) {
            skillsJsonb = skills;
          } else if (typeof skills === 'string') {
            skillsJsonb = JSON.parse(skills);
          } else {
            skillsJsonb = skills;
          }
        } catch {
          skillsJsonb = null;
        }
      }

      // Use database function to bypass RLS
      const { data: result, error: functionError } = await supabase.rpc(
        'update_profile_as_admin',
        {
          p_profile_id: id,
          p_full_name: full_name || null,
          p_job_title: job_title || null,
          p_department: department || null,
          p_team: team || null,
          p_phone: phone || null,
          p_avatar_url: avatar_url || null,
          p_location: location || null,
          p_bio: bio || null,
          p_skills: skillsJsonb,
          p_role: body.role || null, // Allow role editing by admins
        }
      );

      if (functionError) {
        console.error('Function error:', functionError);
        return NextResponse.json(
          { error: `Failed to update profile: ${functionError.message}` },
          { status: 500 }
        );
      }

      if (!result || !result.success) {
        return NextResponse.json(
          { error: result?.error || 'Profile update failed' },
          { status: 400 }
        );
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        organization_id: viewerProfile.organization_id,
        user_id: user.id,
        action: 'update',
        resource_type: 'profile',
        resource_id: id,
        details: {
          fields: Object.keys(body).filter((k) => k !== 'id'),
          edited_by_admin: true,
        },
      });

      return NextResponse.json({ success: true });
    }

    const updateFields: Record<string, any> = {};
    const assign = (k: string, v: any) => {
      if (v !== undefined) updateFields[k] = v;
    };
    assign('full_name', full_name);
    assign('job_title', job_title);
    assign('department', department);
    assign('team', team);
    assign('phone', phone);
    assign('avatar_url', avatar_url);
    assign('bio', bio);
    assign('location', location);

    if (skills !== undefined) {
      try {
        if (Array.isArray(skills)) {
          updateFields.skills = skills;
        } else if (typeof skills === 'string') {
          updateFields.skills = JSON.parse(skills);
        } else {
          updateFields.skills = skills;
        }
      } catch {
        updateFields.skills = [];
      }
    }

    updateFields.updated_at = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from('profiles')
      .update(updateFields)
      .eq('id', id)
      .select('id')
      .single();
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    // Log activity (best-effort)
    await supabase.from('activity_logs').insert({
      organization_id: viewerProfile.organization_id,
      user_id: user.id,
      action: 'update',
      resource_type: 'profile',
      resource_id: id,
      details: { fields: Object.keys(updateFields) },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}


