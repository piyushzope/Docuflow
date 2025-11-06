'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LoadingButton } from '@/components/loading-button';

interface DisconnectButtonProps {
  accountId: string;
  email: string;
}

export function DisconnectButton({ accountId, email }: DisconnectButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${email}?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/email/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show migration error more prominently
        if (data.error && data.error.includes('Database migration required')) {
          const errorMsg = `${data.error}\n\n${data.details || ''}`;
          toast.error(errorMsg, { duration: 10000 });
          throw new Error(data.error);
        }
        throw new Error(data.error || 'Failed to disconnect account');
      }

      toast.success('Email account disconnected successfully');
      // Refresh the page data without full reload
      router.refresh();
      // Small delay to ensure state updates
      setTimeout(() => {
        setLoading(false);
      }, 500);
    } catch (error: any) {
      toast.error(error.message || 'Failed to disconnect account');
      setLoading(false);
    }
  };

  return (
    <LoadingButton
      variant="danger"
      onClick={handleDisconnect}
      loading={loading}
      className="px-3 py-1.5 text-sm"
    >
      Disconnect
    </LoadingButton>
  );
}

