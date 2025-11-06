import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createUnauthorizedResponse, createNotFoundResponse, createSuccessResponse, createInternalErrorResponse } from '@/lib/api-helpers';
import { ErrorMessages, getErrorMessage } from '@/lib/errors';

export async function DELETE(
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
    const requestId = resolvedParams.id;

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return createInternalErrorResponse(ErrorMessages.NO_ORGANIZATION);
    }

    // Verify the document request exists and belongs to the user's organization
    const { data: docRequest, error: fetchError } = await supabase
      .from('document_requests')
      .select('id, organization_id, recipient_email, subject, status')
      .eq('id', requestId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (fetchError || !docRequest) {
      return createNotFoundResponse(ErrorMessages.REQUEST_NOT_FOUND);
    }

    // Check if request can be deleted (prevent deleting completed/expired requests that have documents)
    // Optional: Add business logic here to prevent deletion if needed
    // For now, allow deletion of any request

    // Delete the document request
    const { error: deleteError } = await supabase
      .from('document_requests')
      .delete()
      .eq('id', requestId)
      .eq('organization_id', profile.organization_id);

    if (deleteError) {
      console.error('Error deleting document request:', deleteError);
      // Provide more specific error message
      const errorMessage = deleteError.code === '42501' || deleteError.message?.includes('policy')
        ? 'Permission denied. Please ensure the DELETE policy is enabled for document_requests. Run migration: 20250104000001_add_document_requests_delete_policy.sql'
        : deleteError.message || 'Failed to delete document request';
      return createInternalErrorResponse(errorMessage);
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      action: 'delete',
      resource_type: 'document_request',
      resource_id: requestId,
      details: {
        recipient_email: docRequest.recipient_email,
        subject: docRequest.subject,
        status: docRequest.status,
      },
    });

    return createSuccessResponse(
      { id: requestId },
      'Document request deleted successfully'
    );
  } catch (error: any) {
    console.error('Error deleting document request:', error);
    return createInternalErrorResponse(getErrorMessage(error));
  }
}

