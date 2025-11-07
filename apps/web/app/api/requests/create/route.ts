import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createEmailClient } from '@docuflow/email-integrations';
import { decrypt } from '@docuflow/shared';
import { createRequestSchema, normalizeRequestType } from '@/lib/validation/request-schemas';

/**
 * Helper function to send email for a document request
 * This is extracted so it can be reused in multiple places
 */
async function sendRequestEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  docRequest: any,
  organizationId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get email account - try from request first, then fallback to any active account
    let emailAccount = null;

    if (docRequest.email_account_id) {
      const { data: account } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('id', docRequest.email_account_id)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();

      if (account) {
        emailAccount = account;
      }
    }

    // Fallback: get any active email account for the organization
    if (!emailAccount) {
      const { data: accounts } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .limit(1);

      if (accounts && accounts.length > 0) {
        emailAccount = accounts[0];

        // Update the request with the email account ID
        await supabase
          .from('document_requests')
          .update({ email_account_id: emailAccount.id })
          .eq('id', docRequest.id);
      }
    }

    if (!emailAccount) {
      return {
        success: false,
        error: 'No active email account found. Please connect an email account in Integrations.',
      };
    }

    // Decrypt tokens
    const accessToken = decrypt(emailAccount.encrypted_access_token);
    const refreshToken = emailAccount.encrypted_refresh_token
      ? decrypt(emailAccount.encrypted_refresh_token)
      : undefined;

    // Create email client
    const emailClient = createEmailClient({
      provider: emailAccount.provider,
      email: emailAccount.email,
      accessToken,
      refreshToken,
      expiresAt: emailAccount.expires_at ? new Date(emailAccount.expires_at) : undefined,
    });

    // Send email
    await emailClient.sendEmail({
      to: [docRequest.recipient_email],
      subject: docRequest.subject,
      body: docRequest.message_body || '',
    });

    // Update request status (status history will be logged automatically by trigger)
    await supabase
      .from('document_requests')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        status_changed_by: userId || null, // Track who sent it
        updated_at: new Date().toISOString(),
      })
      .eq('id', docRequest.id);

    return { success: true };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user with better error handling
    let user;
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error('Auth error:', authError);
        // Check for JWT errors (including IDX14100)
        const isJwtError = 
          authError.message?.includes('JWT') || 
          authError.message?.includes('token') ||
          authError.message?.includes('IDX14100') ||
          authError.message?.includes('well formed');
        
        if (isJwtError) {
          return NextResponse.json(
            { 
              error: 'Authentication session expired. Please log in again.',
              code: 'SESSION_EXPIRED'
            },
            { status: 401 }
          );
        }
        return NextResponse.json(
          { error: 'Authentication failed. Please log in again.' },
          { status: 401 }
        );
      }

      user = authUser;
    } catch (error: any) {
      console.error('Error getting user:', error);
      // Check for JWT errors in catch block too
      const isJwtError = 
        error.message?.includes('JWT') || 
        error.message?.includes('token') ||
        error.message?.includes('IDX14100') ||
        error.message?.includes('well formed');
      
      return NextResponse.json(
        { 
          error: 'Authentication error. Please log in again.',
          code: isJwtError ? 'SESSION_EXPIRED' : 'AUTH_ERROR',
          details: isJwtError ? 'Session token invalid or expired' : error.message
        },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to continue.' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate request body with Zod
    const validationResult = createRequestSchema.safeParse(body);
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
    if (validatedData.request_type) {
      validatedData.request_type = normalizeRequestType(validatedData.request_type) || validatedData.request_type;
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 403 });
    }

    // Support both single recipient and bulk recipients
    const recipients = validatedData.recipients && Array.isArray(validatedData.recipients)
      ? validatedData.recipients
      : validatedData.recipient_email
      ? [validatedData.recipient_email]
      : [];

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'At least one recipient is required' }, { status: 400 });
    }

    // Get email account - use selected account or fallback to first active
    let emailAccountId = validatedData.email_account_id || null;
    if (!emailAccountId) {
      const { data: emailAccount } = await supabase
        .from('email_accounts')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .limit(1)
        .single();
      emailAccountId = emailAccount?.id || null;
    }

    // Calculate due date if template provides default_due_days
    let dueDate = validatedData.due_date || null;
    if (!dueDate && validatedData.template_id) {
      const { data: template } = await supabase
        .from('request_templates')
        .select('default_due_days')
        .eq('id', validatedData.template_id)
        .single();
      
      if (template?.default_due_days) {
        const date = new Date();
        date.setDate(date.getDate() + template.default_due_days);
        dueDate = date.toISOString().split('T')[0];
      }
    }

    // Prepare base request data
    const baseRequestData = {
      organization_id: profile.organization_id,
      email_account_id: emailAccountId,
      subject: validatedData.subject,
      message_body: validatedData.message_body || null,
      request_type: validatedData.request_type || null,
      due_date: dueDate || null,
      status: 'pending' as const,
      created_by: user.id,
      template_id: validatedData.template_id || null,
      reminder_months: validatedData.reminder_months ?? 1,
      repeat_interval_type: validatedData.repeat_interval_type || null,
      repeat_interval_value: validatedData.repeat_interval_value || null,
      send_immediately: validatedData.send_immediately !== false, // Default to true
      expected_document_count: validatedData.expected_document_count || null,
      required_document_types: validatedData.required_document_types || null,
      scheduled_send_at: validatedData.scheduled_send_at || null,
      status_changed_by: user.id, // Track who created it
    };

    // Create requests for all recipients
    const requestsToCreate = recipients.map((recipient: string) => ({
      ...baseRequestData,
      recipient_email: recipient.toLowerCase(),
    }));

    const { data: newRequests, error: insertError } = await supabase
      .from('document_requests')
      .insert(requestsToCreate)
      .select();

    if (insertError) {
      throw insertError;
    }

    const createdRequests = newRequests || [];

    // Send emails immediately if requested (and not scheduled)
    if (validatedData.send_immediately !== false && !validatedData.scheduled_send_at && createdRequests.length > 0) {
      // Send emails for all created requests
      const emailResults = await Promise.allSettled(
        createdRequests.map((req) =>
          sendRequestEmail(supabase, req, profile.organization_id, user.id)
        )
      );

      // Log any email sending failures (but don't fail the request creation)
      emailResults.forEach((result, index) => {
        if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)) {
          const error = result.status === 'rejected' ? result.reason : result.value.error;
          console.warn(`Email not sent for request ${createdRequests[index].id}:`, error);
        }
      });
    }

    // Log activity for bulk creation
    await supabase.from('activity_logs').insert(
      createdRequests.map((req) => ({
        organization_id: profile.organization_id,
        user_id: user.id,
        action: 'create',
        resource_type: 'document_request',
        resource_id: req.id,
        details: {
          recipient: req.recipient_email,
          subject: req.subject,
          template_id: req.template_id,
          bulk: recipients.length > 1,
          total_recipients: recipients.length,
        },
      }))
    );

    return NextResponse.json({
      success: true,
      data: createdRequests.length === 1 ? createdRequests[0] : createdRequests,
      count: createdRequests.length,
    });
  } catch (error: any) {
    console.error('Error creating request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create request' },
      { status: 500 }
    );
  }
}

