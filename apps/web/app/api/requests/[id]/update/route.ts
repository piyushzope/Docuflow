import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateRequestSchema, normalizeRequestType } from '@/lib/validation/request-schemas';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle async params (Next.js 15)
    const resolvedParams = await Promise.resolve(params);
    const requestId = resolvedParams.id;

    // Parse and validate request body
    const body = await request.json();
    
    // Validate with Zod
    const validationResult = updateRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;
    
    // Normalize request_type if provided
    if (validatedData.request_type !== undefined && validatedData.request_type !== null) {
      validatedData.request_type = normalizeRequestType(validatedData.request_type) || validatedData.request_type;
    }

    const {
      recipient_email,
      subject,
      message_body,
      request_type,
      due_date,
      status,
    } = validatedData;

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    // Verify the document request exists and belongs to the user's organization
    // Fetch full request including repeat settings
    const { data: docRequest, error: fetchError } = await supabase
      .from('document_requests')
      .select('*, repeat_interval_type, repeat_interval_value, reminder_months, template_id')
      .eq('id', requestId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (fetchError || !docRequest) {
      return NextResponse.json(
        { error: 'Document request not found' },
        { status: 404 }
      );
    }

    // Validate status if provided
    const validStatuses = ['pending', 'sent', 'received', 'missing_files', 'completed', 'expired', 'verifying'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Build update fields (only include provided fields)
    const updateFields: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (recipient_email !== undefined) {
      if (!recipient_email || recipient_email.trim() === '') {
        return NextResponse.json(
          { error: 'Recipient email cannot be empty' },
          { status: 400 }
        );
      }
      updateFields.recipient_email = recipient_email.trim();
    }

    if (subject !== undefined) {
      if (!subject || subject.trim() === '') {
        return NextResponse.json(
          { error: 'Subject cannot be empty' },
          { status: 400 }
        );
      }
      updateFields.subject = subject.trim();
    }

    if (message_body !== undefined) {
      updateFields.message_body = message_body || null;
    }

    if (request_type !== undefined) {
      updateFields.request_type = request_type || null;
    }

    if (due_date !== undefined) {
      updateFields.due_date = due_date || null;
    }

    if (status !== undefined) {
      updateFields.status = status;
      updateFields.status_changed_by = user.id; // Track who changed the status
      if (status === 'completed') {
        updateFields.completed_at = new Date().toISOString();
      }
    }

    // Update expected document count if provided
    if (validatedData.expected_document_count !== undefined) {
      updateFields.expected_document_count = validatedData.expected_document_count || null;
    }

    // Update required_document_types if provided
    if (validatedData.required_document_types !== undefined) {
      updateFields.required_document_types = validatedData.required_document_types || null;
    }

    // Perform the update
    const { error: updateError } = await supabase
      .from('document_requests')
      .update(updateFields)
      .eq('id', requestId)
      .eq('organization_id', profile.organization_id);

    if (updateError) {
      console.error('Error updating document request:', updateError);
      return NextResponse.json(
        { error: 'Failed to update document request' },
        { status: 500 }
      );
    }

    // If status is being set to 'completed' and repeat settings exist, create a new repeated request
    if (status === 'completed' && docRequest.repeat_interval_type && docRequest.repeat_interval_value) {
      try {
        // Call the database function to create repeated request
        const { data: newRequestId, error: repeatError } = await supabase
          .rpc('create_repeated_request', { parent_request_id: requestId });

        if (repeatError) {
          console.error('Error creating repeated request:', repeatError);
          // Don't fail the update if repeat creation fails
        } else if (newRequestId) {
          // If send_immediately is true, send the email for the new request
          // We'll handle this in the cron job or when the request is next processed
          console.log('Created repeated request:', newRequestId);
        }
      } catch (err) {
        console.error('Error in repeat request creation:', err);
        // Don't fail the update if repeat creation fails
      }
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      action: 'update',
      resource_type: 'document_request',
      resource_id: requestId,
      details: {
        fields_updated: Object.keys(updateFields).filter(k => k !== 'updated_at'),
        old_recipient: docRequest.recipient_email,
        old_subject: docRequest.subject,
        new_recipient: recipient_email || docRequest.recipient_email,
        new_subject: subject || docRequest.subject,
      },
    });

    // Fetch updated request
    const { data: updatedRequest } = await supabase
      .from('document_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Document request updated successfully',
      request: updatedRequest,
    });
  } catch (error: any) {
    console.error('Error updating document request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update document request' },
      { status: 500 }
    );
  }
}

