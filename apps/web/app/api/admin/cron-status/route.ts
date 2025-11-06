import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Get cron job execution status
 * GET /api/admin/cron-status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Please log in to continue' },
        { status: 401 }
      );
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found', details: profileError?.message },
        { status: 404 }
      );
    }

    // Check if user has admin or owner role
    if (profile.role !== 'admin' && profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Forbidden', details: 'Only admins and owners can access cron status' },
        { status: 403 }
      );
    }

    // Get cron job status from view
    const { data: statusData, error: statusError } = await supabase
      .from('cron_job_execution_status')
      .select('*');

    if (statusError) {
      // If view doesn't exist, try querying cron.job directly
      const { data: cronJobs, error: cronError } = await supabase.rpc('query', {
        query_text: `
          SELECT 
            jobname as job_name,
            schedule,
            active,
            jobid
          FROM cron.job
          ORDER BY jobname;
        `,
      });

      if (cronError) {
        console.error('Error fetching cron jobs:', cronError);
        return NextResponse.json(
          { error: 'Database error', details: cronError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        jobs: cronJobs || [],
        note: 'Execution history not available. Please run migration to enable monitoring.',
      });
    }

    // Get recent executions
    const { data: recentExecutions, error: execError } = await supabase
      .from('cron_job_executions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      success: true,
      status: statusData || [],
      recent_executions: recentExecutions || [],
    });
  } catch (error: any) {
    console.error('Error fetching cron status:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

