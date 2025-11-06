import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { DocumentViewer } from '@/components/document-viewer';
import { DocumentViewerErrorBoundary } from '@/components/document-viewer-error-boundary';
import { OneDriveFileInfo } from '@/components/onedrive-file-info';
import { DocumentDeleteButton } from '@/components/document-delete-button';
import { DocumentStatusSelector } from '@/components/document-status-selector';
import { DocumentValidationSummary } from '@/components/document-validation-summary';
import { formatFileSize, formatDateTime, getStatusBadgeClasses, formatStatus } from '@/lib/utils';

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
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
    redirect('/dashboard/setup');
  }

  // Fetch document with related information
  const { data: document, error } = await supabase
    .from('documents')
    .select(`
      *,
      document_requests:document_request_id (
        id,
        subject,
        recipient_email,
        status
      ),
      routing_rules:routing_rule_id (
        id,
        name
      )
    `)
    .eq('id', documentId)
    .eq('organization_id', profile.organization_id)
    .single();

  if (error || !document) {
    notFound();
  }

  // Fetch employee profile by sender email
  let senderName: string | null = null;
  if (document.sender_email) {
    const { data: employee } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('organization_id', profile.organization_id)
      .eq('email', document.sender_email)
      .single();
    
    if (employee?.full_name) {
      senderName = employee.full_name;
    }
  }

  const request = document.document_requests as any;
  const rule = document.routing_rules as any;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
      <nav className="mb-6 flex" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-4">
          <li>
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-gray-500"
            >
              Dashboard
            </Link>
          </li>
          <li>
            <svg
              className="h-5 w-5 flex-shrink-0 text-gray-300"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </li>
          <li>
            <Link
              href="/dashboard/documents"
              className="text-gray-400 hover:text-gray-500"
            >
              Documents
            </Link>
          </li>
          <li>
            <svg
              className="h-5 w-5 flex-shrink-0 text-gray-300"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </li>
          <li className="text-gray-500">{document.original_filename}</li>
        </ol>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {document.original_filename}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Document details and preview
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content - Document Viewer */}
        <div className="lg:col-span-2">
          <DocumentViewerErrorBoundary
            documentId={documentId}
            filename={document.original_filename}
            mimeType={document.mime_type || undefined}
            storageProvider={document.storage_provider}
          >
            <DocumentViewer
              documentId={documentId}
              filename={document.original_filename}
              mimeType={document.mime_type || undefined}
              storageProvider={document.storage_provider}
              storagePath={document.storage_path}
            />
          </DocumentViewerErrorBoundary>
        </div>

        {/* Sidebar - Document Metadata */}
        <div className="space-y-6">
          {/* Validation Summary */}
          <DocumentValidationSummary documentId={documentId} />

          {/* Document Info */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Document Information
              </h2>
            </div>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500">File Type</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {document.file_type || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">File Size</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatFileSize(document.file_size)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  MIME Type
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {document.mime_type || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <DocumentStatusSelector
                    documentId={documentId}
                    currentStatus={document.status || 'received'}
                  />
                </dd>
              </div>
            </dl>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <DocumentDeleteButton
                documentId={documentId}
                filename={document.original_filename}
                variant="button"
                className="w-full"
              />
            </div>
          </div>

          {/* Source Information */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Source Information
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  Sender
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {senderName ? (
                    <>
                      {senderName}
                      <span className="text-gray-500 ml-1">({document.sender_email})</span>
                    </>
                  ) : (
                    document.sender_email
                  )}
                </dd>
              </div>
              {request && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">
                    Document Request
                  </dt>
                  <dd className="mt-1">
                    <Link
                      href={`/dashboard/requests/${request.id}`}
                      className="text-sm text-blue-600 hover:text-blue-900"
                    >
                      {request.subject}
                    </Link>
                  </dd>
                </div>
              )}
              {rule && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">
                    Routing Rule
                  </dt>
                  <dd className="mt-1">
                    <Link
                      href={`/dashboard/rules/${rule.id}`}
                      className="text-sm text-blue-600 hover:text-blue-900"
                    >
                      {rule.name}
                    </Link>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  Storage Provider
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {document.storage_provider || '—'}
                </dd>
              </div>
              <OneDriveFileInfo
                documentId={documentId}
                metadata={document.metadata as any}
                storageProvider={document.storage_provider}
              />
            </dl>
          </div>

          {/* Timestamps */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Timestamps
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500">Received</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDateTime(document.created_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDateTime(document.updated_at)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

