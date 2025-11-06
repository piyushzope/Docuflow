import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exportEmployees, DEFAULT_EXPORT_FIELDS, ExportFormat } from '@/lib/utils/employee-export';

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

    // Check permissions (admin/owner for export)
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can export employees' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      format = 'csv',
      employeeIds = null, // If provided, export only selected employees
      fields = DEFAULT_EXPORT_FIELDS,
      filters = {}, // Optional filters: { department, team, role }
    } = body;

    // Validate format
    if (!['csv', 'xlsx', 'json'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid export format. Must be csv, xlsx, or json' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('profiles')
      .select('id, full_name, email, role, job_title, department, team, phone, avatar_url, skills, bio, location, created_at, updated_at')
      .eq('organization_id', profile.organization_id);

    // Apply filters if provided
    if (filters.department) {
      query = query.eq('department', filters.department);
    }
    if (filters.team) {
      query = query.eq('team', filters.team);
    }
    if (filters.role) {
      query = query.eq('role', filters.role);
    }

    // If specific employee IDs provided, filter by them
    if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
      query = query.in('id', employeeIds);
    }

    // Fetch employees
    const { data: employees, error } = await query.order('full_name', {
      ascending: true,
      nullsFirst: false,
    });

    if (error) {
      console.error('Error fetching employees for export:', error);
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 }
      );
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json(
        { error: 'No employees found to export' },
        { status: 404 }
      );
    }

    // Export employees
    const result = exportEmployees({
      format: format as ExportFormat,
      employees,
      fields,
    });

    // Return file
    if (result.content instanceof ArrayBuffer) {
      return new NextResponse(result.content, {
        headers: {
          'Content-Type': result.mimeType,
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
      });
    } else {
      return new NextResponse(result.content, {
        headers: {
          'Content-Type': result.mimeType,
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
      });
    }
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to export employees' },
      { status: 500 }
    );
  }
}

