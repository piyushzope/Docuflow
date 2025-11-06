'use client';

import { formatDate, formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

interface RequestTimelineProps {
  requests: Array<{
    id: string;
    subject: string;
    status: string;
    created_at: string;
    sent_at: string | null;
    completed_at: string | null;
    due_date: string | null;
  }>;
  className?: string;
}

const statusSteps = [
  { key: 'created', label: 'Created', status: ['pending'] },
  { key: 'sent', label: 'Sent', status: ['sent'] },
  { key: 'received', label: 'Received', status: ['received', 'missing_files'] },
  { key: 'completed', label: 'Completed', status: ['completed'] },
];

export function RequestTimeline({ requests, className = '' }: RequestTimelineProps) {
  if (!requests || requests.length === 0) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Request Timeline</h3>
        <p className="text-sm text-slate-500">No requests available</p>
      </div>
    );
  }

  // Get the most recent request for timeline
  const latestRequest = requests[0];

  const getCurrentStep = (status: string) => {
    if (status === 'completed') return 3;
    if (status === 'received' || status === 'missing_files') return 2;
    if (status === 'sent') return 1;
    return 0;
  };

  const currentStep = getCurrentStep(latestRequest.status);

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Request Timeline</h3>
        <Link
          href="/dashboard/requests"
          className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
        >
          View all →
        </Link>
      </div>

      <div className="mb-4">
        <div className="mb-2 text-sm font-medium text-slate-900">
          {latestRequest.subject}
        </div>
        <div className="text-xs text-slate-500">
          Created {formatRelativeTime(latestRequest.created_at)}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Progress line */}
        <div className="absolute left-4 top-0 h-full w-0.5 bg-slate-200">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ height: `${(currentStep / 3) * 100}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {statusSteps.map((step, index) => {
            const animationDelay = index * 100;
            const isActive = index <= currentStep;
            const isCompleted = index < currentStep;
            const stepData = {
              created: latestRequest.created_at,
              sent: latestRequest.sent_at,
              received: latestRequest.status === 'received' || latestRequest.status === 'missing_files'
                ? latestRequest.created_at
                : null,
              completed: latestRequest.completed_at,
            };

            return (
              <div 
                key={step.key} 
                className="relative flex items-start gap-4 animate-fade-in-up"
                style={{ animationDelay: `${animationDelay}ms` }}
              >
                {/* Step indicator */}
                <div
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'border-blue-600 bg-blue-600'
                      : isActive
                        ? 'border-blue-600 bg-white'
                        : 'border-slate-300 bg-white'
                  }`}
                >
                  {isCompleted && (
                    <svg
                      className="h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 pt-1">
                  <div
                    className={`text-sm font-medium ${
                      isActive ? 'text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </div>
                  {stepData[step.key as keyof typeof stepData] && (
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDate(stepData[step.key as keyof typeof stepData])}
                    </div>
                  )}
                  {!stepData[step.key as keyof typeof stepData] && isActive && (
                    <div className="mt-1 text-xs text-slate-400">Pending</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {latestRequest.due_date && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <div className="text-xs font-medium text-slate-600">Due Date</div>
          <div className="text-sm text-slate-900">{formatDate(latestRequest.due_date)}</div>
        </div>
      )}
    </div>
  );
}

