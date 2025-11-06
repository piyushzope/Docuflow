'use client';

import { useEffect, useState } from 'react';

interface OneDriveFileInfoProps {
  documentId: string;
  metadata?: any;
  storageProvider?: string;
}

interface OneDriveInfo {
  path: string;
  webUrl: string | null;
}

export function OneDriveFileInfo({ documentId, metadata, storageProvider }: OneDriveFileInfoProps) {
  const [oneDriveInfo, setOneDriveInfo] = useState<OneDriveInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch for OneDrive documents
    if (storageProvider !== 'onedrive') {
      setLoading(false);
      return;
    }

    // Check if path is already in metadata
    if (metadata?.onedrive_path) {
      setOneDriveInfo({
        path: metadata.onedrive_path,
        webUrl: metadata.onedrive_web_url || null,
      });
      setLoading(false);
      return;
    }

    // Fetch from API
    async function fetchOneDriveInfo() {
      try {
        const response = await fetch(`/api/documents/${documentId}/onedrive-info`);
        if (!response.ok) {
          if (response.status === 401) {
            setError('OneDrive authentication required');
          } else {
            setError('Unable to retrieve OneDrive file location');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setOneDriveInfo(data);
      } catch (err) {
        console.error('Error fetching OneDrive info:', err);
        setError('Failed to retrieve OneDrive file location');
      } finally {
        setLoading(false);
      }
    }

    fetchOneDriveInfo();
  }, [documentId, metadata, storageProvider]);

  if (storageProvider !== 'onedrive') {
    return null;
  }

  if (loading) {
    return (
      <div className="mt-3">
        <dt className="text-xs font-medium text-gray-500">Storage Location</dt>
        <dd className="mt-1 text-sm text-gray-500">Loading...</dd>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-3">
        <dt className="text-xs font-medium text-gray-500">Storage Location</dt>
        <dd className="mt-1 text-sm text-red-600">{error}</dd>
      </div>
    );
  }

  if (!oneDriveInfo) {
    return (
      <div className="mt-3">
        <dt className="text-xs font-medium text-gray-500">Storage Location</dt>
        <dd className="mt-1 text-sm text-gray-500">Location not available</dd>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <dt className="text-xs font-medium text-gray-500">Storage Location</dt>
      <dd className="mt-1">
        <code className="block rounded bg-gray-50 px-2 py-1 text-xs font-mono text-gray-800 break-all">
          {oneDriveInfo.path}
        </code>
        {oneDriveInfo.webUrl && (
          <a
            href={oneDriveInfo.webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            Open in OneDrive
          </a>
        )}
      </dd>
    </div>
  );
}

