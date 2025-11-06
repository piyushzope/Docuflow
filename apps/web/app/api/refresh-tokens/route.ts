import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Manual trigger endpoint for token refresh
 * Only accessible by admins/owners
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Please log in to continue' },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found', details: profileError?.message },
        { status: 404 }
      );
    }

    const profileData = profile as { role: string; organization_id: string | null };

    if (profileData.role !== 'admin' && profileData.role !== 'owner') {
      return NextResponse.json(
        {
          error: 'Forbidden',
          details: 'Only admins and owners can trigger token refresh',
        },
        { status: 403 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase configuration for edge function call');
      return NextResponse.json(
        {
          error: 'Server configuration error',
          details: 'Token refresh service not configured',
        },
        { status: 500 }
      );
    }

    // Call the refresh-tokens edge function
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/refresh-tokens`;
    
    let response: Response | null = null;
    let result: any;
    
    try {
      response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      // Try to parse JSON response
      try {
        result = await response.json();
      } catch (parseError) {
        // If response is not JSON, read as text
        const text = await response.text();
        result = { error: text || 'Failed to parse response' };
      }
    } catch (fetchError: any) {
      console.error('Failed to call edge function:', fetchError);
      return NextResponse.json(
        {
          error: 'Token refresh service unavailable',
          details: response?.status === 404 
            ? 'The refresh-tokens edge function is not deployed. Please deploy it to Supabase Dashboard first.'
            : fetchError.message || 'Network error calling edge function',
        },
        { status: response?.status || 503 }
      );
    }

    if (!response.ok) {
      console.error('Edge function error:', result);
      
      // Provide more helpful error messages
      let errorDetails = result.error || result.message || 'Unknown error';
      
      if (response.status === 404) {
        errorDetails = 'The refresh-tokens edge function is not deployed. Please deploy it to Supabase Dashboard first.';
      } else if (response.status === 500) {
        errorDetails = result.error || 'Edge function encountered an internal error. Check Supabase logs.';
      }
      
      return NextResponse.json(
        {
          error: 'Token refresh failed',
          details: errorDetails,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Token refresh triggered successfully',
      result: {
        refreshed: result.refreshed || 0,
        errors: result.errors || 0,
        duration_ms: result.duration_ms || 0,
        results: result.results || [],
      },
    });
  } catch (error: any) {
    console.error('Error triggering token refresh:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

