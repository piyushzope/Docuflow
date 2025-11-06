'use client';

import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Button component to manually trigger email processing
 * Only visible to admins and owners
 */
export function ProcessEmailsButton() {
  const [processing, setProcessing] = useState(false);

  const handleProcessEmails = async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/process-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      // Log response for debugging (expanded for better visibility)
      console.log('Email processing response:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          toast.error(data.details || 'You must be an admin or owner to trigger email processing');
        } else {
          toast.error(data.details || data.error || 'Failed to process emails');
        }
        return;
      }

      if (data.success) {
        const { processed, errors, accounts_processed, duration_ms, error_details, account_results } = data.result || {};
        const duration = duration_ms ? ` (${(duration_ms / 1000).toFixed(1)}s)` : '';
        
        // Log detailed results for debugging
        console.log('Processing results:', {
          processed,
          errors,
          accounts_processed,
          error_details,
          account_results
        });
        
        if (processed > 0) {
          toast.success(
            `Processed ${processed} email${processed > 1 ? 's' : ''} from ${accounts_processed} account${accounts_processed > 1 ? 's' : ''}${duration}`,
            { duration: 5000 }
          );
        } else {
          toast.success(
            `Email processing completed${duration}. No new emails to process.`,
            { duration: 3000 }
          );
        }

        if (errors > 0) {
          // Show detailed error information if available
          if (error_details && error_details.length > 0) {
            // Show first error in main message
            const firstError = error_details[0];
            const errorMessage = errors === 1 
              ? `Error: ${firstError}`
              : `${errors} errors occurred. First error: ${firstError}`;
            
            toast.warning(errorMessage, {
              duration: 10000, // Longer duration for error details
            });
            
            // Log all errors to console for debugging
            console.error('Email processing errors:', JSON.stringify(error_details, null, 2));
            
            // Log account results with errors
            if (account_results) {
              const accountsWithErrors = account_results.filter((acc: any) => acc.errors > 0);
              if (accountsWithErrors.length > 0) {
                console.error('Accounts with errors:', JSON.stringify(accountsWithErrors, null, 2));
              }
            }
          } else {
            // Check account_results for error details if error_details not available
            if (account_results && Array.isArray(account_results)) {
              const accountsWithErrors = account_results.filter((acc: any) => acc.errors > 0);
              if (accountsWithErrors.length > 0) {
                console.error('Accounts with errors (no error_details):', JSON.stringify(accountsWithErrors, null, 2));
                
                // Try to extract error from account results
                const firstErrorAccount = accountsWithErrors[0];
                const errorMsg = firstErrorAccount.errorDetails && firstErrorAccount.errorDetails.length > 0
                  ? `${firstErrorAccount.accountEmail}: ${firstErrorAccount.errorDetails[0]}`
                  : `${firstErrorAccount.accountEmail}: Error occurred (Edge Function may need redeployment - error details not available)`;
                
                toast.warning(`Error: ${errorMsg}`, {
                  duration: 10000,
                });
                
                // Log suggestion to check Edge Function deployment
                console.warn('⚠️ Edge Function may need redeployment. errorDetails missing from response.', {
                  accountResults: accountsWithErrors,
                  suggestion: 'Run: supabase functions deploy process-emails'
                });
              } else {
                toast.warning(`${errors} error${errors > 1 ? 's' : ''} occurred during processing. Check console and edge function logs for details.`, {
                  duration: 5000,
                });
              }
            } else {
              toast.warning(`${errors} error${errors > 1 ? 's' : ''} occurred during processing. Check console and edge function logs for details.`, {
                duration: 5000,
              });
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error processing emails:', error);
      toast.error(error.message || 'Failed to process emails');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <button
      onClick={handleProcessEmails}
      disabled={processing}
      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {processing ? (
        <>
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Processing...
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Process Emails Now
        </>
      )}
    </button>
  );
}

