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
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    // Get account details
    const { data: account } = await supabase
      .from('email_accounts')
      .select('id, email, provider, is_active, expires_at')
      .eq('id', accountId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Test the token by triggering a test email processing
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Call process-emails edge function with specific account
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/process-emails`;
    
    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ account_id: accountId }),
      });

      const result = await response.json();

      // Check if there are errors for this specific account
      if (result.account_results && Array.isArray(result.account_results)) {
        const accountResult = result.account_results.find(
          (r: any) => r.accountId === accountId
        );

        if (accountResult && accountResult.errors > 0) {
          const errorMessage =
            accountResult.errorDetails && accountResult.errorDetails.length > 0
              ? accountResult.errorDetails[0]
              : 'Unknown error occurred';

          // Check if it's a token error
          const isTokenError =
            errorMessage.includes('401') ||
            errorMessage.includes('expired') ||
            errorMessage.includes('authentication failed') ||
            errorMessage.includes('JWT') ||
            errorMessage.includes('token');

          return NextResponse.json({
            hasError: true,
            errorMessage: isTokenError
              ? errorMessage
              : `Processing error: ${errorMessage}`,
            isTokenError,
          });
        }
      }

      return NextResponse.json({
        hasError: false,
        message: 'Token is valid',
      });
    } catch (error: any) {
      return NextResponse.json({
        hasError: true,
        errorMessage: `Failed to test token: ${error.message}`,
      });
    }
  } catch (error: any) {
    console.error('Error checking email account status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check account status' },
      { status: 500 }
    );
  }
}

