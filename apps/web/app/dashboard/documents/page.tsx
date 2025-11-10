import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { UploadStatusBadge } from '@/components/upload-status-badge';
import { DocumentDeleteButton } from '@/components/document-delete-button';
import { formatDate, getStatusBadgeClasses, formatStatus } from '@/lib/utils';

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    redirect('/dashboard/setup');
  }

  const organizationId = profile.organization_id;

  // Diagnostic logging (server-side only, visible in terminal/logs)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Documents Page] Diagnostic Info:', {
      userId: user.id,
      organizationId,
      timestamp: new Date().toISOString(),
    });
  }

  // Fetch all documents for the organization
  // Use a simpler approach: query documents first, then fetch related data separately
  // This avoids RLS issues with joins that might filter out documents
  let documents: any[] | null = null;
  let queryError: any = null;
  let showWarning = false;

  // Step 1: Fetch documents without joins (most reliable)
  // RLS policy will automatically filter by organization_id via get_user_organization_id()
  // We also add explicit filter for clarity and as a safety measure
  const { data: allDocuments, error: documentsError, count: totalCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (documentsError) {
    console.error('[Documents Page] Error fetching documents:', {
      error: documentsError,
      organizationId,
      userId: user.id,
    });
    queryError = documentsError;
    documents = [];
  } else {
    documents = allDocuments || [];

    if (process.env.NODE_ENV === 'development') {
      console.log('[Documents Page] Query Results:', {
        documentCount: documents.length,
        totalCount,
        organizationId,
      });
    }

    // Step 2: Fetch related data separately to avoid RLS join issues
    if (documents.length > 0) {
      // Get unique document_request_ids and routing_rule_ids
      const documentRequestIds = documents
        .map((d) => d.document_request_id)
        .filter((id): id is string => id !== null);
      const routingRuleIds = documents
        .map((d) => d.routing_rule_id)
        .filter((id): id is string => id !== null);

      // Fetch document requests
      const requestsMap = new Map();
      if (documentRequestIds.length > 0) {
        const { data: requests, error: requestsError } = await supabase
          .from('document_requests')
          .select('id, subject, recipient_email, status')
          .in('id', documentRequestIds);

        if (requestsError) {
          console.warn('[Documents Page] Error fetching document requests:', requestsError);
          showWarning = true;
        } else {
          requests?.forEach((req) => {
            requestsMap.set(req.id, req);
          });
        }
      }

      // Fetch routing rules
      const rulesMap = new Map();
      if (routingRuleIds.length > 0) {
        const { data: rules, error: rulesError } = await supabase
          .from('routing_rules')
          .select('id, name')
          .in('id', routingRuleIds);

        if (rulesError) {
          console.warn('[Documents Page] Error fetching routing rules:', rulesError);
          showWarning = true;
        } else {
          rules?.forEach((rule) => {
            rulesMap.set(rule.id, rule);
          });
        }
      }

      // Attach related data to documents
      documents = documents.map((doc) => ({
        ...doc,
        document_requests: doc.document_request_id
          ? requestsMap.get(doc.document_request_id) || null
          : null,
        routing_rules: doc.routing_rule_id
          ? rulesMap.get(doc.routing_rule_id) || null
          : null,
      }));
    }
  }

  // Fetch employee profiles for sender emails
  const senderEmails = documents?.map((d: any) => d.sender_email).filter(Boolean) || [];
  const { data: employees } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('organization_id', profile.organization_id)
    .in('email', senderEmails.length > 0 ? senderEmails : ['']);

  // Create a map of email -> full_name
  const employeeMap = new Map<string, string>();
  employees?.forEach((emp: any) => {
    if (emp.email && emp.full_name) {
      employeeMap.set(emp.email, emp.full_name);
    }
  });

  return (
    <>
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Documents</h1>
            <p className="mt-2 text-sm text-slate-600">
              View and manage all collected documents
            </p>
          </div>
        </div>

      <div className="mt-8">
        {queryError && (
          <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Warning: Some documents may not be displayed
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>There was an issue loading document relationships. All documents are shown, but some related information may be missing.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {showWarning && !queryError && (
          <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Information: Some document relationships could not be loaded
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>All documents are displayed, but some related request or routing rule information may be unavailable.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {documents && documents.length > 0 ? (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Sender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Request
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Upload
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Received
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {documents.map((document: any) => {
                  const request = document.document_requests;
                  const rule = document.routing_rules;

                  return (
                    <tr key={document.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/documents/${document.id}`}
                          className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
                        >
                          {document.original_filename}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {document.file_type || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {employeeMap.get(document.sender_email) || document.sender_email}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {request ? (
                          <Link
                            href={`/dashboard/requests/${request.id}`}
                            className="text-blue-600 transition-colors hover:text-blue-700"
                          >
                            {request.subject}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeClasses(document.status || 'received')}`}
                        >
                          {formatStatus(document.status || 'received')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <UploadStatusBadge
                          status={document.upload_verification_status}
                          error={document.upload_error}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(document.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/dashboard/documents/${document.id}`}
                            className="text-blue-600 transition-colors hover:text-blue-700"
                          >
                            View
                          </Link>
                          <DocumentDeleteButton
                            documentId={document.id}
                            filename={document.original_filename}
                            variant="link"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No documents yet"
            description="Documents will appear here once they are received via email"
            actionLabel="View Requests"
            actionHref="/dashboard/requests"
          />
        )}
        </div>
      </div>
    </>
  );
}

