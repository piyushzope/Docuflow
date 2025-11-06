import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createUnauthorizedResponse, createNotFoundResponse, createSuccessResponse, createInternalErrorResponse } from '@/lib/api-helpers';
import { ErrorMessages, getErrorMessage } from '@/lib/errors';

export async function PATCH(
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

    // Parse request body
    const body = await request.json();
    const { status } = body;

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return createInternalErrorResponse(ErrorMessages.NO_ORGANIZATION);
    }

    // Verify the document exists and belongs to the user's organization
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('id, organization_id, original_filename, status')
      .eq('id', documentId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (fetchError || !document) {
      return createNotFoundResponse(ErrorMessages.DOCUMENT_NOT_FOUND);
    }

    // Validate status if provided
    const validStatuses = ['received', 'processed', 'verified', 'rejected'];
    if (status !== undefined) {
      if (!validStatuses.includes(status)) {
        return createInternalErrorResponse(
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        );
      }
    }

    // Build update fields
    const updateFields: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) {
      updateFields.status = status;
    }

    // Perform the update
    const { error: updateError } = await supabase
      .from('documents')
      .update(updateFields)
      .eq('id', documentId)
      .eq('organization_id', profile.organization_id);

    if (updateError) {
      console.error('Error updating document:', updateError);
      return createInternalErrorResponse(
        updateError.message || 'Failed to update document'
      );
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      action: 'update',
      resource_type: 'document',
      resource_id: documentId,
      details: {
        filename: document.original_filename,
        old_status: document.status,
        new_status: status,
      },
    });

    return createSuccessResponse(
      { id: documentId, status },
      'Document updated successfully'
    );
  } catch (error: any) {
    console.error('Error updating document:', error);
    return createInternalErrorResponse(getErrorMessage(error, 'Failed to update document'));
  }
}

