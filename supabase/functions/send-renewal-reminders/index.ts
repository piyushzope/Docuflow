// Supabase Edge Function to send document renewal reminders
// Scheduled via Supabase Cron jobs (pg_cron)
// 
// This function:
// 1. Finds documents expiring soon (90, 60, 30 days) or expired
// 2. Checks for unsent renewal reminders
// 3. Sends reminder emails to employees and admins
// 4. Updates reminder status

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ReminderResult {
  reminderId: string;
  documentId: string;
  employeeEmail: string;
  reminderType: string;
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
    const error = await response.text().catch(() => '');
    throw new Error(`Gmail API error: ${response.status} ${error}`);
  }
}

/**
 * Send reminder email via Outlook/Microsoft Graph API
 */
async function sendOutlookReminder(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const message = {
    message: {
      subject,
      body: {
        contentType: 'Text',
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
    const error = await response.text().catch(() => '');
    throw new Error(`Microsoft Graph API error: ${response.status} ${error}`);
  }
}

/**
 * Generate reminder email content
 */
function generateReminderEmail(
  reminderType: string,
  documentName: string,
  expiryDate: string,
  daysUntilExpiry: number | null
): { subject: string; body: string } {
  const expiryDateFormatted = new Date(expiryDate).toLocaleDateString();
  
  let subject: string;
  let body: string;

  if (reminderType === 'expired') {
    subject = `URGENT: Your ${documentName} has expired`;
    body = `Your ${documentName} expired on ${expiryDateFormatted}. Please renew it immediately to avoid any issues.

Document: ${documentName}
Expiry Date: ${expiryDateFormatted}

Please submit a renewed document as soon as possible.`;
  } else if (reminderType === '30_days') {
    subject = `REMINDER: Your ${documentName} expires in 30 days`;
    body = `This is a reminder that your ${documentName} will expire in 30 days.

Document: ${documentName}
Expiry Date: ${expiryDateFormatted}
Days Remaining: ${daysUntilExpiry}

Please submit a renewed document before the expiry date.`;
  } else if (reminderType === '60_days') {
    subject = `REMINDER: Your ${documentName} expires in 60 days`;
    body = `This is a reminder that your ${documentName} will expire in 60 days.

Document: ${documentName}
Expiry Date: ${expiryDateFormatted}
Days Remaining: ${daysUntilExpiry}

Please start preparing to renew this document.`;
  } else if (reminderType === '90_days') {
    subject = `REMINDER: Your ${documentName} expires in 90 days`;
    body = `This is a friendly reminder that your ${documentName} will expire in 90 days.

Document: ${documentName}
Expiry Date: ${expiryDateFormatted}
Days Remaining: ${daysUntilExpiry}

Please plan to renew this document in the coming weeks.`;
  } else {
    subject = `REMINDER: Your ${documentName} is expiring soon`;
    body = `This is a reminder about your expiring document.

Document: ${documentName}
Expiry Date: ${expiryDateFormatted}
Days Remaining: ${daysUntilExpiry || 'Unknown'}

Please submit a renewed document before the expiry date.`;
  }

  return { subject, body };
}

/**
 * Send renewal reminders
 */
async function sendRenewalReminders(supabase: any, encryptionKey: string): Promise<ReminderResult[]> {
  const results: ReminderResult[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Get all unsent reminders due today
  const { data: reminders, error: remindersError } = await supabase
    .from('document_renewal_reminders')
    .select(`
      *,
      documents:document_id (
        id,
        original_filename,
        organization_id,
        sender_email
      ),
      profiles:employee_id (
        id,
        email,
        full_name
      )
    `)
    .eq('reminder_date', today)
    .eq('email_sent', false);

  if (remindersError) {
    console.error('Error fetching reminders:', remindersError);
    return results;
  }

  if (!reminders || reminders.length === 0) {
    console.log('No reminders to send today');
    return results;
  }

  console.log(`Found ${reminders.length} reminders to send`);

  for (const reminder of reminders) {
    const document = reminder.documents;
    let employee = reminder.profiles;

    if (!document) {
      console.warn(`Skipping reminder ${reminder.id}: missing document`);
      continue;
    }

    // If employee not found via employee_id, try to find by sender_email
    if (!employee && document.sender_email) {
      const { data: employeeByEmail } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('organization_id', document.organization_id)
        .eq('email', document.sender_email)
        .single();
      
      if (employeeByEmail) {
        employee = employeeByEmail;
      }
    }

    if (!employee) {
      console.warn(`Skipping reminder ${reminder.id}: could not find employee for document ${document.id}`);
      results.push({
        reminderId: reminder.id,
        documentId: document.id,
        employeeEmail: document.sender_email || 'unknown',
        reminderType: reminder.reminder_type,
        success: false,
        error: 'Employee not found',
      });
      continue;
    }

    // Get organization's email account for sending
    const { data: emailAccounts } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('organization_id', document.organization_id)
      .eq('is_active', true)
      .limit(1);

    if (!emailAccounts || emailAccounts.length === 0) {
      console.warn(`No active email account for organization ${document.organization_id}`);
      results.push({
        reminderId: reminder.id,
        documentId: document.id,
        employeeEmail: employee.email,
        reminderType: reminder.reminder_type,
        success: false,
        error: 'No active email account configured',
      });
      continue;
    }

    const emailAccount = emailAccounts[0];
    const config = emailAccount.config as any || {};
    
    let accessToken: string;
    try {
      accessToken = config.encrypted_access_token
        ? decrypt(config.encrypted_access_token, encryptionKey)
        : config.accessToken;
    } catch (error) {
      console.error(`Failed to decrypt access token for account ${emailAccount.id}:`, error);
      results.push({
        reminderId: reminder.id,
        documentId: document.id,
        employeeEmail: employee.email,
        reminderType: reminder.reminder_type,
        success: false,
        error: 'Failed to decrypt access token',
      });
      continue;
    }

    if (!accessToken) {
      results.push({
        reminderId: reminder.id,
        documentId: document.id,
        employeeEmail: employee.email,
        reminderType: reminder.reminder_type,
        success: false,
        error: 'Access token not found',
      });
      continue;
    }

    // Get expiry date from validation
    const { data: validation } = await supabase
      .from('document_validations')
      .select('expiry_date, days_until_expiry')
      .eq('document_id', document.id)
      .single();

    const expiryDate = validation?.expiry_date || reminder.reminder_date;
    const daysUntilExpiry = validation?.days_until_expiry || null;

    // Generate email content
    const { subject, body } = generateReminderEmail(
      reminder.reminder_type,
      document.original_filename,
      expiryDate,
      daysUntilExpiry
    );

    try {
      // Send email
      if (emailAccount.provider === 'gmail') {
        await sendGmailReminder(accessToken, employee.email, subject, body);
      } else if (emailAccount.provider === 'outlook') {
        await sendOutlookReminder(accessToken, employee.email, subject, body);
      } else {
        throw new Error(`Unsupported email provider: ${emailAccount.provider}`);
      }

      // Update reminder status
      await supabase
        .from('document_renewal_reminders')
        .update({
          email_sent: true,
          sent_at: new Date().toISOString(),
        })
        .eq('id', reminder.id);

      // Log activity
      await supabase.from('activity_logs').insert({
        organization_id: document.organization_id,
        action: 'renewal_reminder_sent',
        resource_type: 'document',
        resource_id: document.id,
        details: {
          reminder_type: reminder.reminder_type,
          employee_email: employee.email,
          expiry_date: expiryDate,
        },
      });

      console.log(`✅ Sent ${reminder.reminder_type} reminder for document ${document.id} to ${employee.email}`);

      results.push({
        reminderId: reminder.id,
        documentId: document.id,
        employeeEmail: employee.email,
        reminderType: reminder.reminder_type,
        success: true,
      });
    } catch (error: any) {
      console.error(`❌ Failed to send reminder ${reminder.id}:`, error);
      results.push({
        reminderId: reminder.id,
        documentId: document.id,
        employeeEmail: employee.email,
        reminderType: reminder.reminder_type,
        success: false,
        error: error.message || 'Failed to send email',
      });
    }
  }

  return results;
}

/**
 * Main serve handler
 */
serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Send renewal reminders
    const results = await sendRenewalReminders(supabase, encryptionKey);

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        sent: successCount,
        errors: errorCount,
        results,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Renewal reminder function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send renewal reminders',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

