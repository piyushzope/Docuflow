import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Debug endpoint to diagnose document visibility issues
 * Only available in development mode
 * 
 * GET /api/debug/documents
 * Returns diagnostic information about documents and RLS policies
 */
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Debug endpoint only available in development' },
      { status: 403 }
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: userError?.message },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found', details: profileError?.message },
        { status: 404 }
      );
    }

    const organizationId = profile.organization_id;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'No organization assigned to user' },
        { status: 400 }
      );
    }

    // Test RLS function (if exposed as RPC)
    // Note: get_user_organization_id is a SECURITY DEFINER function used in RLS policies
    // It may not be directly callable via RPC, so we'll test it indirectly via a query
    let orgIdFromFunction: any = null;
    let functionError: any = null;
    try {
      // Try to call it as RPC (if exposed)
      const { data, error } = await supabase.rpc('get_user_organization_id');
      orgIdFromFunction = data;
      functionError = error;
    } catch (err: any) {
      functionError = { message: err.message || 'Function not callable as RPC' };
    }

    // Count documents with explicit filter
    const { count: explicitCount, error: explicitError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    // Count documents without explicit filter (RLS only)
    const { count: rlsCount, error: rlsError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true });

    // Get sample documents
    const { data: sampleDocuments, error: documentsError } = await supabase
      .from('documents')
      .select('id, original_filename, organization_id, created_at, sender_email, status')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Check for documents with different organization_id (shouldn't be visible)
    const { count: otherOrgCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .neq('organization_id', organizationId);

    // Get email accounts for this organization
    const { data: emailAccounts, error: accountsError } = await supabase
      .from('email_accounts')
      .select('id, email, organization_id, is_active')
      .eq('organization_id', organizationId);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      profile: {
        organization_id: organizationId,
        role: profile.role,
      },
      rlsFunction: {
        result: orgIdFromFunction,
        error: functionError?.message,
        matches: orgIdFromFunction === organizationId,
      },
      documentCounts: {
        withExplicitFilter: explicitCount,
        withRLSOnly: rlsCount,
        otherOrganizations: otherOrgCount,
        explicitFilterError: explicitError?.message,
        rlsFilterError: rlsError?.message,
      },
      sampleDocuments: sampleDocuments || [],
      documentsError: documentsError?.message,
      emailAccounts: emailAccounts || [],
      emailAccountsError: accountsError?.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Debug Documents] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

