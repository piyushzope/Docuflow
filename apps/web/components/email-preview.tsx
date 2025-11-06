'use client';

import { useState } from 'react';
import { format } from 'date-fns';

interface EmailPreviewProps {
  subject: string;
  messageBody: string;
  recipientEmail: string;
  recipientName?: string;
  dueDate?: string;
  requestType?: string;
  className?: string;
}

export default function EmailPreview({
  subject,
  messageBody,
  recipientEmail,
  recipientName,
  dueDate,
  requestType,
  className = '',
}: EmailPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Replace variables in message body
  const replaceVariables = (text: string): string => {
    let processed = text;
    
    if (recipientName) {
      processed = processed.replace(/{recipient_name}/g, recipientName);
    }
    processed = processed.replace(/{recipient_name}/g, recipientEmail.split('@')[0]);
    
    if (dueDate) {
      try {
        const formattedDate = format(new Date(dueDate), 'MMMM d, yyyy');
        processed = processed.replace(/{due_date}/g, formattedDate);
      } catch {
        processed = processed.replace(/{due_date}/g, dueDate);
      }
    }
    processed = processed.replace(/{due_date}/g, 'Not set');
    
    if (requestType) {
      processed = processed.replace(/{request_type}/g, requestType);
    }
    processed = processed.replace(/{request_type}/g, 'Document Request');

    return processed;
  };

  const processedBody = replaceVariables(messageBody || '');
  const processedSubject = replaceVariables(subject || '');

  return (
    <div className={`border border-gray-200 rounded-lg bg-white ${className}`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">Email Preview</h3>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-gray-600 hover:text-gray-900"
          aria-label={isExpanded ? 'Collapse preview' : 'Expand preview'}
        >
          {isExpanded ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4">
          <div className="space-y-4">
            {/* Email Header */}
            <div className="border-b border-gray-200 pb-3 space-y-2">
              <div>
                <span className="text-xs font-medium text-gray-500">To:</span>
                <p className="text-sm text-gray-900 mt-0.5">
                  {recipientName ? `${recipientName} <${recipientEmail}>` : recipientEmail}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500">Subject:</span>
                <p className="text-sm text-gray-900 font-medium mt-0.5">
                  {processedSubject || <span className="text-gray-400 italic">No subject</span>}
                </p>
              </div>
            </div>

            {/* Email Body */}
            <div className="min-h-[100px]">
              <span className="text-xs font-medium text-gray-500 block mb-2">Message:</span>
              <div
                className="prose prose-sm max-w-none text-gray-900 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: processedBody || '<p class="text-gray-400 italic">No message body</p>',
                }}
              />
            </div>

            {/* Variables Status */}
            {(messageBody.includes('{recipient_name}') ||
              messageBody.includes('{due_date}') ||
              messageBody.includes('{request_type}')) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">
                  <strong>Note:</strong> Variables will be replaced when the email is sent:
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {messageBody.includes('{recipient_name}') && (
                    <li>
                      <code className="bg-gray-100 px-1 rounded">{'{recipient_name}'}</code> →{' '}
                      {recipientName || recipientEmail.split('@')[0]}
                    </li>
                  )}
                  {messageBody.includes('{due_date}') && (
                    <li>
                      <code className="bg-gray-100 px-1 rounded">{'{due_date}'}</code> →{' '}
                      {dueDate ? format(new Date(dueDate), 'MMMM d, yyyy') : 'Not set'}
                    </li>
                  )}
                  {messageBody.includes('{request_type}') && (
                    <li>
                      <code className="bg-gray-100 px-1 rounded">{'{request_type}'}</code> →{' '}
                      {requestType || 'Document Request'}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

