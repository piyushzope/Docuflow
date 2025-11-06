'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { logViewerError, determineErrorType } from '@/lib/viewer-logging';

interface Props {
  children: ReactNode;
  documentId: string;
  filename: string;
  mimeType?: string;
  storageProvider?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary specifically for document viewer
 * Catches rendering errors and provides user-friendly error messages
 */
export class DocumentViewerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error with viewer context
    const errorType = determineErrorType(error);
    logViewerError(this.props.documentId, error, errorType, {
      mimeType: this.props.mimeType,
      storageProvider: this.props.storageProvider,
      filename: this.props.filename,
    });

    console.error('[DocumentViewer ErrorBoundary]', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      documentId: this.props.documentId,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 truncate">{this.props.filename}</h3>
          </div>
          <div className="p-6">
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-red-800">Error rendering document viewer</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      An unexpected error occurred while rendering the document viewer. 
                      Please try refreshing the page or contact support if the problem persists.
                    </p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        this.setState({ hasError: false, error: null });
                        window.location.reload();
                      }}
                      className="text-sm font-medium text-red-800 hover:text-red-900 underline"
                    >
                      Reload page
                    </button>
                  </div>
                  {process.env.NODE_ENV === 'development' && this.state.error && (
                    <details className="mt-4">
                      <summary className="text-xs text-gray-500 cursor-pointer">Error Details</summary>
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {this.state.error.message}
                        {'\n\n'}
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

