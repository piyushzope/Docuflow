import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createEmailClient } from '@docuflow/email-integrations';
import { decrypt } from '@docuflow/shared';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const requestId = formData.get('requestId') as string;

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
    }

    // Get document request
    const { data: docRequest, error: requestError } = await supabase
      .from('document_requests')
      .select('*, email_accounts(*)')
      .eq('id', requestId)
      .single();

    if (requestError || !docRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profile?.organization_id !== docRequest.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if request is still pending
    if (docRequest.status !== 'pending' && docRequest.status !== 'sent') {
      return NextResponse.json(
        { error: 'Request is not pending' },
        { status: 400 }
      );
    }

    // Get email account
    if (!docRequest.email_account_id) {
      return NextResponse.json(
        { error: 'No email account configured' },
        { status: 400 }
      );
    }

    const emailAccount = docRequest.email_accounts;
    if (!emailAccount) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 404 });
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

    // Send reminder email
    const reminderSubject = `Reminder: ${docRequest.subject}`;
    const reminderBody = `This is a reminder that we are still waiting for your document submission.

Original request:
${docRequest.message_body || 'Please submit the requested documents.'}

${docRequest.due_date ? `Due date: ${new Date(docRequest.due_date).toLocaleDateString()}` : ''}

Thank you.`;

    await emailClient.sendEmail({
      to: [docRequest.recipient_email],
      subject: reminderSubject,
      body: reminderBody,
    });

    // Log activity
    await supabase.from('activity_logs').insert({
      organization_id: docRequest.organization_id,
      user_id: user.id,
      action: 'send_reminder',
      resource_type: 'document_request',
      resource_id: requestId,
      details: {
        recipient: docRequest.recipient_email,
      },
    });

    return NextResponse.redirect(
      new URL(`/dashboard/requests?success=reminder_sent`, request.url)
    );
  } catch (error: any) {
    console.error('Error sending reminder:', error);
    return NextResponse.redirect(
      new URL(`/dashboard/requests?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}