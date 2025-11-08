'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { LoadingButton } from '@/components/loading-button';
import SmartDatePicker from '@/components/smart-date-picker';
import EmailAccountSelector from '@/components/email-account-selector';
import RichTextEditor from '@/components/rich-text-editor';
import EmailPreview from '@/components/email-preview';
import ScheduleSendPicker from '@/components/schedule-send-picker';
import MultiRecipientPicker from '@/components/multi-recipient-picker';
import RecipientHistory from '@/components/recipient-history';
import DocumentRequirementsBuilder from '@/components/document-requirements-builder';
import { normalizeRequestType } from '@/lib/validation/request-schemas';

interface RequestTemplate {
  id: string;
  name: string;
  subject: string;
  message_body: string | null;
  request_type: string | null;
  default_due_days: number;
  default_reminder_months: number;
}

interface Recipient {
  email: string;
  name?: string;
  source: 'employee' | 'manual';
}

interface DocumentRequirement {
  type: string;
  required: boolean;
  fileTypes?: string[];
}

export default function NewRequestPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<RequestTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    template_id: '',
    recipients: [] as Recipient[],
    subject: '',
    message_body: '',
    request_type: '',
    due_date: '',
    reminder_months: 1,
    repeat_enabled: false,
    repeat_interval_type: 'months' as 'days' | 'months',
    repeat_interval_value: 1,
    send_immediately: true,
    scheduled_send_at: null as string | null,
    email_account_id: null as string | null,
    expected_document_count: null as number | null,
    required_document_types: [] as DocumentRequirement[],
  });

  // Load templates and organization
  useEffect(() => {
    async function loadData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!profile?.organization_id) {
          setLoadingTemplates(false);
          return;
        }

        setOrganizationId(profile.organization_id);

        // Load global templates and organization-specific templates
        const { data: templatesData, error: templatesError } = await supabase
          .from('request_templates')
          .select('*')
          .or(`is_global.eq.true,organization_id.eq.${profile.organization_id}`)
          .order('name');

        if (!templatesError && templatesData) {
          setTemplates(templatesData as RequestTemplate[]);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoadingTemplates(false);
      }
    }

    loadData();
  }, [supabase]);

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      const dueDate = template.default_due_days
        ? new Date(Date.now() + template.default_due_days * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0]
        : '';

      setFormData({
        ...formData,
        template_id: templateId,
        subject: template.subject,
        message_body: template.message_body || '',
        request_type: template.request_type || '',
        due_date: dueDate,
        reminder_months: template.default_reminder_months,
      });
    }
  };

  // Handle clone from history
  const handleCloneRequest = (request: any) => {
    setFormData({
      ...formData,
      subject: request.subject,
      request_type: request.request_type || '',
      due_date: request.due_date ? new Date(request.due_date).toISOString().split('T')[0] : '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Client-side validation
      if (formData.recipients.length === 0) {
        setError('At least one recipient is required');
        setLoading(false);
        return;
      }

      if (!formData.subject.trim()) {
        setError('Subject is required');
        setLoading(false);
        return;
      }

      // Confirm bulk operations
      if (formData.recipients.length > 10) {
        const confirmed = window.confirm(
          `You are about to create ${formData.recipients.length} requests. This may take a moment. Continue?`
        );
        if (!confirmed) {
          setLoading(false);
          return;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        setError('Please create or join an organization first');
        setLoading(false);
        return;
      }

      // Prepare request data - normalize empty strings to null for optional fields
      const requestData = {
        recipients: formData.recipients.map((r) => r.email),
        subject: formData.subject,
        message_body: formData.message_body?.trim() || null,
        request_type: formData.request_type?.trim() 
          ? normalizeRequestType(formData.request_type.trim()) 
          : null,
        due_date: formData.due_date?.trim() || null,
        template_id: formData.template_id?.trim() || null,
        reminder_months: formData.reminder_months,
        repeat_interval_type: formData.repeat_enabled ? formData.repeat_interval_type : null,
        repeat_interval_value: formData.repeat_enabled ? formData.repeat_interval_value : null,
        send_immediately: formData.send_immediately,
        scheduled_send_at: formData.scheduled_send_at?.trim() || null,
        email_account_id: formData.email_account_id?.trim() || null,
        expected_document_count: formData.expected_document_count,
        required_document_types:
          formData.required_document_types.length > 0
            ? formData.required_document_types
            : null,
      };

      // Get current session to ensure we have valid auth
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError('Your session has expired. Please log in again.');
        router.push('/login');
        return;
      }

      const response = await fetch('/api/requests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result.error || 'Failed to create request';
        // Handle validation errors with detailed messages
        if (result.details && Array.isArray(result.details)) {
          // Format Zod validation errors into readable messages
          const validationErrors = result.details
            .map((err: any) => {
              const field = err.path?.join('.') || 'field';
              const message = err.message || 'Invalid value';
              return `${field}: ${message}`;
            })
            .join('; ');
          throw new Error(`${errorMsg}: ${validationErrors}`);
        } else if (result.details) {
          throw new Error(`${errorMsg}: ${result.details}`);
        }
        throw new Error(errorMsg);
      }

      const count = result.count || 1;
      // Success - redirect with appropriate message
      if (count > 1) {
        router.push(`/dashboard/requests?success=bulk_created&count=${count}`);
      } else {
        router.push(`/dashboard/requests?success=created`);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create request';
      setError(errorMsg);
      setLoading(false);
    }
  };

  // Get primary recipient for preview and history
  const primaryRecipient = formData.recipients[0];
  const primaryRecipientEmail = primaryRecipient?.email || '';
  const primaryRecipientName = primaryRecipient?.name;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">New Document Request</h1>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
              <Link
                href="/dashboard/requests"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                ← Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4" role="alert">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
              {/* Template Selection */}
              <div>
                <label
                  htmlFor="template_id"
                  className="block text-sm font-medium text-gray-700"
                >
                  Request Template (Optional)
                </label>
                <select
                  id="template_id"
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                  value={formData.template_id}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                >
                  <option value="">Select a template...</option>
                  {loadingTemplates ? (
                    <option>Loading templates...</option>
                  ) : (
                    templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))
                  )}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Using a template will pre-fill the subject, message, and request type
                </p>
              </div>

              {/* Multi-Recipient Picker */}
              <MultiRecipientPicker
                recipients={formData.recipients}
                onChange={(recipients) =>
                  setFormData({ ...formData, recipients })
                }
              />

              {/* Recipient History - Show for first recipient */}
              {primaryRecipientEmail && (
                <RecipientHistory
                  recipientEmail={primaryRecipientEmail}
                  onCloneRequest={handleCloneRequest}
                />
              )}

              {/* Subject */}
              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium text-gray-700"
                >
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="subject"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                />
              </div>

              {/* Rich Text Editor */}
              <RichTextEditor
                value={formData.message_body}
                onChange={(value) =>
                  setFormData({ ...formData, message_body: value })
                }
                label="Message Body"
                showVariableHelper={true}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Request Type */}
                <div>
                  <label
                    htmlFor="request_type"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Request Type
                  </label>
                  <input
                    type="text"
                    id="request_type"
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g., ID Verification"
                    value={formData.request_type}
                    onChange={(e) =>
                      setFormData({ ...formData, request_type: e.target.value })
                    }
                  />
                </div>

                {/* Smart Date Picker */}
                <SmartDatePicker
                  value={formData.due_date}
                  onChange={(date) => setFormData({ ...formData, due_date: date })}
                  label="Due Date"
                />
              </div>

              {/* Email Account Selector */}
              <EmailAccountSelector
                value={formData.email_account_id}
                onChange={(accountId) =>
                  setFormData({ ...formData, email_account_id: accountId })
                }
                organizationId={organizationId || undefined}
              />

              {/* Schedule Send Picker */}
              <ScheduleSendPicker
                sendImmediately={formData.send_immediately}
                scheduledSendAt={formData.scheduled_send_at}
                onSendImmediatelyChange={(immediate) =>
                  setFormData({ ...formData, send_immediately: immediate })
                }
                onScheduledSendAtChange={(dateTime) =>
                  setFormData({ ...formData, scheduled_send_at: dateTime })
                }
              />

              {/* Document Requirements Builder */}
              <DocumentRequirementsBuilder
                requirements={formData.required_document_types}
                expectedCount={formData.expected_document_count}
                onRequirementsChange={(requirements) =>
                  setFormData({ ...formData, required_document_types: requirements })
                }
                onExpectedCountChange={(count) =>
                  setFormData({ ...formData, expected_document_count: count })
                }
              />

              {/* Reminder Settings */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Reminder Settings</h3>
                <div>
                  <label
                    htmlFor="reminder_months"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Reminder Period (months before expiration) *
                  </label>
                  <input
                    type="number"
                    id="reminder_months"
                    min="0"
                    max="24"
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                    value={formData.reminder_months}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reminder_months: Math.max(
                          0,
                          Math.min(24, parseInt(e.target.value) || 0)
                        ),
                      })
                    }
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Set to 0 to disable reminders. Max 24 months (supports 2-year reminders for
                    MEC).
                  </p>
                </div>
              </div>

              {/* Repeat Settings */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-4 flex items-center">
                  <input
                    type="checkbox"
                    id="repeat_enabled"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={formData.repeat_enabled}
                    onChange={(e) =>
                      setFormData({ ...formData, repeat_enabled: e.target.checked })
                    }
                  />
                  <label
                    htmlFor="repeat_enabled"
                    className="ml-2 block text-sm font-semibold text-gray-900"
                  >
                    Enable Automatic Repeat
                  </label>
                </div>

                {formData.repeat_enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="repeat_interval_type"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Repeat Interval Type
                      </label>
                      <select
                        id="repeat_interval_type"
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                        value={formData.repeat_interval_type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            repeat_interval_type: e.target.value as 'days' | 'months',
                          })
                        }
                      >
                        <option value="days">Days</option>
                        <option value="months">Months</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="repeat_interval_value"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Repeat Every
                      </label>
                      <input
                        type="number"
                        id="repeat_interval_value"
                        min="1"
                        required={formData.repeat_enabled}
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                        value={formData.repeat_interval_value}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            repeat_interval_value: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                      />
                    </div>
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  When enabled, a new request will be automatically created after the specified
                  interval when the previous request is completed.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Link
                  href="/dashboard/requests"
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Link>
                <LoadingButton type="submit" loading={loading}>
                  {formData.recipients.length > 1
                    ? `Create ${formData.recipients.length} Requests`
                    : 'Create Request'}
                </LoadingButton>
              </div>
            </form>
          </div>

          {/* Email Preview Sidebar */}
          {showPreview && (
            <div className="lg:col-span-1">
              <EmailPreview
                subject={formData.subject}
                messageBody={formData.message_body}
                recipientEmail={primaryRecipientEmail}
                recipientName={primaryRecipientName}
                dueDate={formData.due_date}
                requestType={formData.request_type}
                className="sticky top-6"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
