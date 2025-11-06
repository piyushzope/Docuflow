// Supabase Edge Function to send document request reminders
// Scheduled via Supabase Cron jobs (pg_cron)
// 
// This function:
// 1. Finds pending/sent document requests that are approaching due date
// 2. Sends reminder emails to recipients
// 3. Updates request status and logs activity

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ReminderResult {
  requestId: string;
  recipientEmail: string;
  subject: string;
  success: boolean;
  error?: string;
}

// Simple XOR encryption/decryption (matches @docuflow/shared)
function decrypt(encryptedText: string, key: string): string {
  if (!encryptedText) return encryptedText;
  try {
    const text = atob(encryptedText);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Send reminder email via Gmail API
 */
async function sendGmailReminder(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  // Build raw email message
  const boundary = '----=_Part_0_' + Date.now();
  let rawMessage = '';
  
  rawMessage += `To: ${to}\r\n`;
  rawMessage += `Subject: ${subject}\r\n`;
  rawMessage += `MIME-Version: 1.0\r\n`;
  rawMessage += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
  
  rawMessage += `--${boundary}\r\n`;
  rawMessage += `Content-Type: text/plain; charset=utf-8\r\n\r\n`;
  rawMessage += body + '\r\n';
  rawMessage += `--${boundary}--`;
  
  // Encode message for Gmail API (base64url encoding)
  const encodedMessage = btoa(rawMessage)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage,
      }),
    }
  );
  
  if (!response.ok) {
    if (response.status === 401) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Gmail API authentication failed (401): Token may be expired. ${errorText}`);
    }
    const errorText = await response.text().catch(() => '');
    throw new Error(`Gmail API error (${response.status}): ${errorText}`);
  }
}

/**
 * Send reminder email via Microsoft Graph API
 */
async function sendOutlookReminder(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const message = {
    message: {
      subject: subject,
      body: {
        contentType: 'text',
        content: body,
      },
      toRecipients: [
        {
          emailAddress: {
            address: to,
          },
        },
      ],
    },
  };
  
  const response = await fetch(
    'https://graph.microsoft.com/v1.0/me/sendMail',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    }
  );
  
  if (!response.ok) {
    if (response.status === 401) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Microsoft Graph API authentication failed (401): Token may be expired. ${errorText}`);
    }
    const errorText = await response.text().catch(() => '');
    throw new Error(`Microsoft Graph API error (${response.status}): ${errorText}`);
  }
}

/**
 * Send reminder email for a document request
 */
async function sendReminderEmail(
  supabase: any,
  request: any,
  emailAccount: any,
  encryptionKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Decrypt access token
    const accessToken = decrypt(emailAccount.encrypted_access_token, encryptionKey);
    
    // Build reminder email content
    const reminderSubject = `Reminder: ${request.subject}`;
    const dueDateText = request.due_date 
      ? `\nDue date: ${new Date(request.due_date).toLocaleDateString()}`
      : '';
    
    const reminderBody = `This is a reminder that we are still waiting for your document submission.

Original request:
${request.message_body || 'Please submit the requested documents.'}
${dueDateText}

${request.organizations?.name ? `Organization: ${request.organizations.name}\n` : ''}
Thank you for your attention to this matter.`;
    
    // Send email based on provider
    if (emailAccount.provider === 'gmail') {
      await sendGmailReminder(accessToken, request.recipient_email, reminderSubject, reminderBody);
    } else if (emailAccount.provider === 'outlook') {
      await sendOutlookReminder(accessToken, request.recipient_email, reminderSubject, reminderBody);
    } else {
      throw new Error(`Unsupported email provider: ${emailAccount.provider}`);
    }
    
    // Log activity
    await supabase.from('activity_logs').insert({
      organization_id: request.organization_id,
      action: 'reminder_sent',
      resource_type: 'document_request',
      resource_id: request.id,
      details: {
        recipient_email: request.recipient_email,
        subject: request.subject,
        due_date: request.due_date,
        reminder_subject: reminderSubject,
      },
    });
    
    console.log(`Reminder sent for request ${request.id} to ${request.recipient_email}`);
    return { success: true };
  } catch (error: any) {
    console.error(`Error sending reminder for request ${request.id}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Main handler for the Edge Function
 */
serve(async (req) => {
  const startTime = Date.now();
  console.log('Send reminders Edge Function started');

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    if (!encryptionKey) {
      throw new Error('Missing ENCRYPTION_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find requests that need reminders:
    // 1. Status is 'pending' or 'sent' or 'missing_files'
    // 2. Has reminder_months set (> 0)
    // 3. Due date is within the reminder period OR past due
    // 4. No reminder sent recently (last_reminder_sent is null or > 7 days ago)
    const now = new Date();
    
    const { data: requests, error: requestsError } = await supabase
      .from('document_requests')
      .select(`
        *,
        organizations:organization_id (
          id,
          name
        )
      `)
      .in('status', ['pending', 'sent', 'missing_files'])
      .gt('reminder_months', 0)
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true });
    
    // Filter requests where reminder should be sent:
    // - Due date minus reminder_months is <= now (time to send reminder)
    // - And due date >= now (not expired yet, or also send for expired)
    const requestsNeedingReminders = requests?.filter((req) => {
      if (!req.due_date) return false;
      
      const dueDate = new Date(req.due_date);
      const reminderDate = new Date(dueDate);
      reminderDate.setMonth(reminderDate.getMonth() - (req.reminder_months || 0));
      
      // Check if we should send reminder (reminder date has passed, but due date hasn't or is near)
      const shouldRemind = reminderDate <= now;
      
      // Also check if last reminder was sent more than 7 days ago (or never sent)
      if (shouldRemind && req.last_reminder_sent) {
        const lastReminder = new Date(req.last_reminder_sent);
        const daysSinceReminder = (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceReminder >= 7; // Send reminder again if 7+ days have passed
      }
      
      return shouldRemind;
    }) || [];

    if (requestsError) {
      console.error('Error fetching document requests:', requestsError);
      throw requestsError;
    }

    if (requestsNeedingReminders.length === 0) {
      console.log('No requests need reminders');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No requests need reminders',
          reminders_sent: 0,
          duration_ms: Date.now() - startTime,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${requestsNeedingReminders.length} request(s) needing reminders`);

    const results: ReminderResult[] = [];
    let totalSent = 0;
    let totalErrors = 0;

    // Process each request
    for (const request of requestsNeedingReminders) {
      try {
        // Get active email account for this organization
        const { data: emailAccount } = await supabase
          .from('email_accounts')
          .select('*')
          .eq('organization_id', request.organization_id)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (!emailAccount) {
          results.push({
            requestId: request.id,
            recipientEmail: request.recipient_email,
            subject: request.subject,
            success: false,
            error: 'No active email account found for organization',
          });
          totalErrors++;
          continue;
        }

        // Send reminder
        const result = await sendReminderEmail(supabase, request, emailAccount, encryptionKey);

        if (result.success) {
          // Update last reminder sent timestamp
          await supabase
            .from('document_requests')
            .update({
              last_reminder_sent: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', request.id);

          results.push({
            requestId: request.id,
            recipientEmail: request.recipient_email,
            subject: request.subject,
            success: true,
          });
          totalSent++;
        } else {
          results.push({
            requestId: request.id,
            recipientEmail: request.recipient_email,
            subject: request.subject,
            success: false,
            error: result.error,
          });
          totalErrors++;
        }
      } catch (error) {
        console.error(`Failed to process reminder for request ${request.id}:`, error);
        totalErrors++;
        results.push({
          requestId: request.id,
          recipientEmail: request.recipient_email,
          subject: request.subject,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `Reminder sending complete: ${totalSent} sent, ${totalErrors} errors (${duration}ms)`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reminder sending completed',
        reminders_sent: totalSent,
        errors: totalErrors,
        requests_processed: requestsNeedingReminders.length,
        request_results: results,
        duration_ms: duration,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Reminder sending failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: duration,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

