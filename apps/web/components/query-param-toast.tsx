'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/lib/hooks/use-toast';

/**
 * Component that shows toast notifications based on URL query parameters
 * Use this in pages that redirect with success/error query params
 */
export function QueryParamToast() {
  const searchParams = useSearchParams();
  const toast = useToast();

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const details = searchParams.get('details');

    if (success) {
      const messages: Record<string, string> = {
        created: 'Request created successfully',
        updated: 'Request updated successfully',
        deleted: 'Request deleted successfully',
        sent: 'Request sent successfully',
        employee_added: 'Employee added successfully',
        storage_connected: 'Storage connected successfully',
        email_connected: 'Email account connected successfully',
      };
      
      const message = messages[success] || 'Operation completed successfully';
      toast.success(message);
    }

    if (error) {
      const errorMessage = details 
        ? `${error}: ${decodeURIComponent(details)}`
        : error;
      toast.error(errorMessage);
    }
  }, [searchParams, toast]);

  return null; // This component doesn't render anything
}

