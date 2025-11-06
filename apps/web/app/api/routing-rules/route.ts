import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createUnauthorizedResponse, createInternalErrorResponse, createSuccessResponse } from '@/lib/api-helpers';
import { ErrorMessages } from '@/lib/errors';

/**
 * GET /api/routing-rules
 * Fetch all routing rules for the user's organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return createUnauthorizedResponse(ErrorMessages.UNAUTHORIZED);
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return createInternalErrorResponse(ErrorMessages.NO_ORGANIZATION);
    }

    // Fetch routing rules
    const { data: rules, error } = await supabase
      .from('routing_rules')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('priority', { ascending: false });

    if (error) {
      console.error('Error fetching routing rules:', error);
      return createInternalErrorResponse('Failed to fetch routing rules');
    }

    return createSuccessResponse(rules || []);
  } catch (error: any) {
    console.error('Error in GET /api/routing-rules:', error);
    return createInternalErrorResponse(
      error?.message || 'Failed to fetch routing rules'
    );
  }
}

