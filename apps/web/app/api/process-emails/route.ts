import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Manually trigger email processing for all active email accounts
 * Requires admin/owner role
 */
export async function POST(request: NextRequest) {
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

    // Get user profile to check role and organization
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

    // Check if user has admin or owner role
    if (profile.role !== 'admin' && profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Forbidden', details: 'Only admins and owners can trigger email processing' },
        { status: 403 }
      );
    }

    if (!profile.organization_id) {
      return NextResponse.json(
        { error: 'No organization', details: 'User must be part of an organization' },
        { status: 400 }
      );
    }

    // Get Supabase URL and service role key from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase configuration for edge function call');
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Email processing service not configured' },
        { status: 500 }
      );
    }

    // Call the process-emails edge function
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/process-emails`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const result = await response.json();

    // Log raw edge function response for debugging
    console.log('Raw Edge Function response:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error('Edge function error:', result);
      return NextResponse.json(
        {
          error: 'Email processing failed',
          details: result.error || 'Unknown error',
        },
        { status: response.status }
      );
    }

    // Extract error details from account results for better error reporting
    const errorDetails: string[] = [];
    const fileUploadResults: Array<{
      accountEmail: string;
      filename?: string;
      storagePath?: string;
      error?: string;
      errorCategory?: string;
    }> = [];
    
    if (result.account_results && Array.isArray(result.account_results)) {
      for (const accountResult of result.account_results) {
        // Log each account result for debugging
        if (accountResult.errors > 0) {
          console.error(`Account ${accountResult.accountEmail} had errors:`, JSON.stringify(accountResult, null, 2));
        }
        
        if (accountResult.errors > 0 && accountResult.errorDetails) {
          errorDetails.push(...accountResult.errorDetails.map((err: string) => `${accountResult.accountEmail}: ${err}`));
          
          // Try to extract file-level error details
          accountResult.errorDetails.forEach((err: string) => {
            // Parse error message for file details if available
            const fileMatch = err.match(/([^:]+\.(pdf|doc|docx|jpg|png|zip|txt|etc))|filename:?\s*([^\s,]+)/i);
            const storageMatch = err.match(/path[:\s]+([^\s,]+)/i);
            const categoryMatch = err.match(/\[(\w+)\]/);
            
            fileUploadResults.push({
              accountEmail: accountResult.accountEmail,
              filename: fileMatch ? (fileMatch[1] || fileMatch[3]) : undefined,
              storagePath: storageMatch ? storageMatch[1] : undefined,
              error: err,
              errorCategory: categoryMatch ? categoryMatch[1] : undefined,
            });
          });
        } else if (accountResult.errors > 0) {
          // If errorDetails is missing but errors > 0, create a generic error message
          errorDetails.push(`${accountResult.accountEmail}: Error occurred (details not available - check Edge Function logs)`);
          fileUploadResults.push({
            accountEmail: accountResult.accountEmail,
            error: 'Error occurred (details not available - check Edge Function logs)',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Email processing triggered successfully',
      result: {
        processed: result.processed || 0,
        errors: result.errors || 0,
        accounts_processed: result.accounts_processed || 0,
        duration_ms: result.duration_ms || 0,
        account_results: result.account_results || [],
        error_details: errorDetails.length > 0 ? errorDetails : undefined,
        file_upload_results: fileUploadResults.length > 0 ? fileUploadResults : undefined,
      },
    });
  } catch (error: any) {
    console.error('Error triggering email processing:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

