import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Get upload errors for admin review
 * GET /api/admin/upload-errors
 * Query params: date, account, provider, limit
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
        { error: 'Forbidden', details: 'Only admins and owners can access upload errors' },
        { status: 403 }
      );
    }

    if (!profile.organization_id) {
      return NextResponse.json(
        { error: 'No organization', details: 'User must be part of an organization' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get('date');
    const accountFilter = searchParams.get('account');
    const providerFilter = searchParams.get('provider');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Build query
    let query = supabase
      .from('documents')
      .select(`
        id,
        original_filename,
        sender_email,
        storage_provider,
        storage_path,
        upload_error,
        upload_verification_status,
        upload_verified_at,
        created_at,
        email_accounts:email_account_id (
          id,
          email,
          provider
        ),
        storage_configs:storage_config_id (
          id,
          name,
          provider
        )
      `)
      .eq('organization_id', profile.organization_id)
      .or('upload_error.is.not.null,upload_verification_status.eq.failed,upload_verification_status.eq.not_found')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (dateFilter) {
      const date = new Date(dateFilter);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      query = query.gte('created_at', date.toISOString()).lt('created_at', nextDay.toISOString());
    }

    if (accountFilter) {
      query = query.eq('email_account_id', accountFilter);
    }

    if (providerFilter) {
      query = query.eq('storage_provider', providerFilter);
    }

    const { data: documents, error } = await query;

    if (error) {
      console.error('Error fetching upload errors:', error);
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }

    // Format response
    const errors = (documents || []).map((doc: any) => ({
      id: doc.id,
      filename: doc.original_filename,
      sender: doc.sender_email,
      provider: doc.storage_provider,
      storagePath: doc.storage_path,
      error: doc.upload_error,
      verificationStatus: doc.upload_verification_status,
      verifiedAt: doc.upload_verified_at,
      createdAt: doc.created_at,
      emailAccount: doc.email_accounts ? {
        id: doc.email_accounts.id,
        email: doc.email_accounts.email,
        provider: doc.email_accounts.provider,
      } : null,
      storageConfig: doc.storage_configs ? {
        id: doc.storage_configs.id,
        name: doc.storage_configs.name,
        provider: doc.storage_configs.provider,
      } : null,
    }));

    // Get summary statistics
    const totalErrors = errors.length;
    const byStatus = errors.reduce((acc: any, err: any) => {
      acc[err.verificationStatus] = (acc[err.verificationStatus] || 0) + 1;
      return acc;
    }, {});
    const byProvider = errors.reduce((acc: any, err: any) => {
      acc[err.provider] = (acc[err.provider] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      errors,
      summary: {
        total: totalErrors,
        byStatus,
        byProvider,
      },
    });
  } catch (error: any) {
    console.error('Error fetching upload errors:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

