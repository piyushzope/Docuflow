'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingButton } from './loading-button';
import { toast } from 'sonner';

interface DocumentDeleteButtonProps {
  documentId: string;
  filename: string;
  variant?: 'button' | 'link';
  className?: string;
}

export function DocumentDeleteButton({
  documentId,
  filename,
  variant = 'button',
  className = '',
}: DocumentDeleteButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone and will remove the file from storage.`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/delete`, {
        method: 'DELETE',
      });

      // Check if response is ok before parsing
      if (!response.ok) {
        // Parse error response
        let errorData: any = {};
        let errorMessage = response.statusText || `Failed to delete document (${response.status})`;
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
            // Try to parse as text first, then JSON
            const text = await response.text();
            if (text) {
              try {
                errorData = JSON.parse(text);
              } catch {
                errorData = { error: text, message: text };
              }
            }
          }
          
          // Extract error message from response
          errorMessage = errorData?.error || errorData?.message || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          // errorMessage already has fallback value
        }
        
        if (errorMessage.includes('migration') || errorMessage.includes('policy')) {
          toast.error(errorMessage, { duration: 10000 });
          console.error('Delete failed - Migration required:', { 
            status: response.status, 
            statusText: response.statusText,
            errorMessage,
            errorData 
          });
          throw new Error(errorMessage);
        }
        
        console.error('Delete document error:', { 
          status: response.status, 
          statusText: response.statusText,
          errorMessage,
          errorData 
        });
        throw new Error(errorMessage);
      }

      // Parse successful response
      let data: any = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonError) {
          console.warn('Failed to parse success response as JSON:', jsonError);
        }
      }

      toast.success(data?.message || 'Document deleted successfully');
      router.refresh();
      // If on detail page, redirect to list
      if (window.location.pathname.includes('/documents/')) {
        router.push('/dashboard/documents');
      }
    } catch (error: any) {
      console.error('Delete document failed:', error);
      toast.error(error.message || 'Failed to delete document');
      setDeleting(false);
    }
  };

  if (variant === 'link') {
    return (
      <button
        onClick={handleDelete}
        disabled={deleting}
        className={`text-red-600 hover:text-red-900 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
    );
  }

  return (
    <LoadingButton
      variant="danger"
      onClick={handleDelete}
      loading={deleting}
      className={className}
    >
      Delete
    </LoadingButton>
  );
}

