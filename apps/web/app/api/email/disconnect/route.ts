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

    // Parse request body
    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Get user's organization
    const { data: profile, error: profileError } = await (supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single() as any);

    if (profileError || !profile || !(profile as any).organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    const organizationId = (profile as any).organization_id as string;

    // Verify the email account exists and belongs to the user's organization
    const { data: emailAccounts, error: fetchError } = await supabase
      .from('email_accounts')
      .select('id, email, organization_id, provider, is_active')
      .eq('id', accountId)
      .eq('organization_id', organizationId);

    if (fetchError) {
      console.error('Error fetching email account:', fetchError);
      return NextResponse.json(
        { error: 'Failed to verify email account' },
        { status: 500 }
      );
    }

    if (!emailAccounts || emailAccounts.length === 0) {
      return NextResponse.json(
        { error: 'Email account not found or you do not have permission to disconnect it' },
        { status: 404 }
      );
    }

    const emailAccount = emailAccounts[0] as {
      id: string;
      email: string;
      organization_id: string;
      provider: 'gmail' | 'outlook';
      is_active: boolean;
    };

    // Check if account is already inactive
    if (!emailAccount.is_active) {
      return NextResponse.json(
        { error: 'Email account is already disconnected' },
        { status: 400 }
      );
    }

    // Mark account as inactive and clear tokens securely
    // Use RPC or direct update with proper error handling
    const updatePayload: any = {
      is_active: false,
      encrypted_access_token: null,
      encrypted_refresh_token: null,
      expires_at: null,
      updated_at: new Date().toISOString(),
    };
    // @ts-ignore - Supabase types not fully inferred in this context
    const { data: updatedAccount, error: updateError } = await supabase
      .from('email_accounts')
      .update(updatePayload)
      .eq('id', accountId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (updateError) {
      console.error('Error disconnecting email account:', updateError);
      
      // Check for constraint violation errors
      const errorMessage = updateError.message || '';
      const isConstraintError = 
        errorMessage.includes('not-null constraint') ||
        errorMessage.includes('null value in column') ||
        updateError.code === '23502';
      
      if (isConstraintError) {
        return NextResponse.json(
          { 
            error: 'Database migration required. Please run the migration: 20250104000000_allow_all_users_disconnect_email.sql',
            details: 'The encrypted_access_token column needs to allow NULL values. Run the migration in your Supabase SQL editor.',
            migration_file: 'supabase/migrations/20250104000000_allow_all_users_disconnect_email.sql'
          },
          { status: 500 }
        );
      }
      
      // Other error handling
      const finalErrorMessage = updateError.code === 'PGRST116' 
        ? 'Email account not found or permission denied'
        : errorMessage || 'Failed to disconnect email account';
      return NextResponse.json(
        { error: finalErrorMessage, details: updateError },
        { status: 500 }
      );
    }

    if (!updatedAccount) {
      return NextResponse.json(
        { error: 'Email account was not updated. Please check permissions.' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      organization_id: organizationId,
      user_id: user.id,
      action: 'disconnect',
      resource_type: 'email_account',
      details: {
        email: emailAccount.email,
        provider: emailAccount.provider,
        account_id: accountId,
      },
    } as any);

    return NextResponse.json({
      success: true,
      message: 'Email account disconnected successfully',
    });
  } catch (error: any) {
    console.error('Error disconnecting email account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect email account' },
      { status: 500 }
    );
  }
}

