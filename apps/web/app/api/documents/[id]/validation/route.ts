import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createUnauthorizedResponse, createNotFoundResponse, createSuccessResponse, createInternalErrorResponse } from '@/lib/api-helpers';
import { ErrorMessages } from '@/lib/errors';

export async function GET(
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
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return createInternalErrorResponse(ErrorMessages.NO_ORGANIZATION);
    }

    // Fetch validation with related employee profile
    const { data: validation, error: validationError } = await supabase
      .from('document_validations')
      .select(`
        *,
        profiles:matched_employee_id (
          id,
          full_name,
          email
        )
      `)
      .eq('document_id', documentId)
      .single();

    if (validationError) {
      if (validationError.code === 'PGRST116') {
        // No validation found
        return createNotFoundResponse('Validation not found');
      }
      throw validationError;
    }

    // Verify document belongs to user's organization
    const { data: document } = await supabase
      .from('documents')
      .select('organization_id')
      .eq('id', documentId)
      .single();

    if (!document || document.organization_id !== profile.organization_id) {
      return createNotFoundResponse('Document not found');
    }

    return createSuccessResponse(validation);
  } catch (error: any) {
    console.error('Error fetching document validation:', error);
    return createInternalErrorResponse(
      error?.message || ErrorMessages.DOCUMENT_NOT_FOUND
    );
  }
}

