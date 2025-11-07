import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createUnauthorizedResponse, createNotFoundResponse, createSuccessResponse, createInternalErrorResponse } from '@/lib/api-helpers';
import { ErrorMessages } from '@/lib/errors';

/**
 * Manually trigger document validation
 * POST /api/documents/[id]/validate
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return createUnauthorizedResponse(ErrorMessages.UNAUTHORIZED);
    }

    // Handle async params (Next.js 15)
    const resolvedParams = await Promise.resolve(params);
    const documentId = resolvedParams.id;

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return createInternalErrorResponse(ErrorMessages.NO_ORGANIZATION);
    }

    // Only admins and owners can trigger validation
    if (profile.role !== 'admin' && profile.role !== 'owner') {
      return createUnauthorizedResponse('Only admins and owners can trigger validation');
    }

    // Verify document belongs to user's organization
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, organization_id, validation_status')
      .eq('id', documentId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (docError || !document) {
      return createNotFoundResponse('Document not found');
    }

    // Get Supabase URL and service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return createInternalErrorResponse('Server configuration error');
    }

    // Update validation status to 'validating'
    await supabase
      .from('documents')
      .update({ validation_status: 'validating' })
      .eq('id', documentId);

    // Check rate limit (simple in-memory check - in production, use Redis or DB)
    // For now, we'll implement a basic check using a database table
    const rateLimitWindow = 60; // 60 seconds
    const maxRequests = 10; // Max 10 requests per window
    
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', profile.organization_id)
      .single();
    
    const rateLimitConfig = org?.settings?.validation?.rate_limit || {};
    const windowSeconds = rateLimitConfig.windowSeconds || rateLimitWindow;
    const maxRequestsPerWindow = rateLimitConfig.maxRequests || maxRequests;
    
    // Check recent validation requests from this user
    const windowStart = new Date(Date.now() - windowSeconds * 1000);
    const { count: recentCount } = await supabase
      .from('validation_executions')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id)
      .eq('triggered_by_user_id', user.id)
      .gte('started_at', windowStart.toISOString());
    
    if (recentCount && recentCount >= maxRequestsPerWindow) {
      return createInternalErrorResponse(
        `Rate limit exceeded. Maximum ${maxRequestsPerWindow} validations per ${windowSeconds} seconds. Please try again later.`
      );
    }

    // Trigger validation edge function asynchronously
    const validationUrl = `${supabaseUrl}/functions/v1/validate-document`;
    
    try {
      const response = await fetch(validationUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'x-triggered-by': 'manual',
          'x-triggered-by-user-id': user.id,
        },
        body: JSON.stringify({ documentId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Validation failed: ${errorText}`);
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        organization_id: profile.organization_id,
        user_id: user.id,
        action: 'validate_document',
        resource_type: 'document',
        resource_id: documentId,
        details: {
          triggered_by: 'manual',
        },
      });

      return createSuccessResponse({
        message: 'Validation triggered successfully',
        documentId,
      });
    } catch (error: any) {
      // Update status back to pending on error
      await supabase
        .from('documents')
        .update({ validation_status: 'pending' })
        .eq('id', documentId);

      throw error;
    }
  } catch (error: any) {
    console.error('Error triggering validation:', error);
    return createInternalErrorResponse(
      error?.message || 'Failed to trigger validation'
    );
  }
}

