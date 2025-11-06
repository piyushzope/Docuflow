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

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    // Check permissions (admin/owner for bulk operations)
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can perform bulk operations' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, employeeIds, ...actionData } = body;

    if (!action || !employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Action and employeeIds are required' },
        { status: 400 }
      );
    }

    // Verify all employees belong to the organization
    const { data: employees, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .in('id', employeeIds)
      .eq('organization_id', profile.organization_id);

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to verify employees' },
        { status: 500 }
      );
    }

    const validIds = (employees || []).map((e) => e.id);
    if (validIds.length !== employeeIds.length) {
      return NextResponse.json(
        { error: 'Some employees not found or do not belong to your organization' },
        { status: 403 }
      );
    }

    let result: any = {};

    switch (action) {
      case 'delete': {
        // Delete employees (cascade will handle auth.users deletion if configured)
        const { error: deleteError } = await supabase
          .from('profiles')
          .delete()
          .in('id', validIds);

        if (deleteError) {
          return NextResponse.json(
            { error: `Failed to delete employees: ${deleteError.message}` },
            { status: 500 }
          );
        }

        result = {
          message: `Successfully deleted ${validIds.length} employee(s)`,
          deleted: validIds.length,
        };
        break;
      }

      case 'edit': {
        // Bulk update employees
        const updateFields: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        // Only update fields that are provided
        if (actionData.department !== undefined) {
          updateFields.department = actionData.department || null;
        }
        if (actionData.team !== undefined) {
          updateFields.team = actionData.team || null;
        }
        if (actionData.role !== undefined) {
          if (!['owner', 'admin', 'member'].includes(actionData.role)) {
            return NextResponse.json(
              { error: 'Invalid role. Must be owner, admin, or member' },
              { status: 400 }
            );
          }
          updateFields.role = actionData.role;
        }
        if (actionData.job_title !== undefined) {
          updateFields.job_title = actionData.job_title || null;
        }

        if (Object.keys(updateFields).length === 1) {
          // Only updated_at, nothing to update
          return NextResponse.json(
            { error: 'No fields to update' },
            { status: 400 }
          );
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateFields)
          .in('id', validIds);

        if (updateError) {
          return NextResponse.json(
            { error: `Failed to update employees: ${updateError.message}` },
            { status: 500 }
          );
        }

        result = {
          message: `Successfully updated ${validIds.length} employee(s)`,
          updated: validIds.length,
        };
        break;
      }

      case 'tag': {
        // Add/remove skills (tags) from employees
        const { operation, skills } = actionData;
        if (!operation || !skills || !Array.isArray(skills)) {
          return NextResponse.json(
            { error: 'Invalid tag operation. Operation (add/remove) and skills array required' },
            { status: 400 }
          );
        }

        // Get current employees with skills
        const { data: currentEmployees, error: fetchErr } = await supabase
          .from('profiles')
          .select('id, skills')
          .in('id', validIds);

        if (fetchErr) {
          return NextResponse.json(
            { error: 'Failed to fetch employee skills' },
            { status: 500 }
          );
        }

        // Update each employee's skills
        const updates = (currentEmployees || []).map(async (emp) => {
          let currentSkills: string[] = [];
          if (emp.skills) {
            if (Array.isArray(emp.skills)) {
              currentSkills = emp.skills;
            } else if (typeof emp.skills === 'string') {
              try {
                currentSkills = JSON.parse(emp.skills);
              } catch {
                currentSkills = [];
              }
            }
          }

          let newSkills: string[];
          if (operation === 'add') {
            newSkills = [...new Set([...currentSkills, ...skills])];
          } else {
            newSkills = currentSkills.filter((s) => !skills.includes(s));
          }

          const { error: updateErr } = await supabase
            .from('profiles')
            .update({
              skills: newSkills.length > 0 ? newSkills : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', emp.id);

          return updateErr;
        });

        const errors = (await Promise.all(updates)).filter(Boolean);
        if (errors.length > 0) {
          return NextResponse.json(
            { error: `Failed to update some employees: ${errors[0]?.message}` },
            { status: 500 }
          );
        }

        result = {
          message: `Successfully ${operation === 'add' ? 'added' : 'removed'} skills from ${validIds.length} employee(s)`,
          updated: validIds.length,
        };
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      action: `bulk_${action}`,
      resource_type: 'employees',
      details: {
        count: validIds.length,
        ...result,
      },
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Bulk operation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}

