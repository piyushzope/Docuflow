'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: ReactNode;
  variant?: 'default' | 'minimal';
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon,
  variant = 'default',
}: EmptyStateProps) {
  if (variant === 'minimal') {
    return (
      <div className="text-center py-8">
        {icon && <div className="mb-3">{icon}</div>}
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className="mt-4 inline-block text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
          >
            {actionLabel}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
      {icon && <div className="mx-auto mb-4 text-slate-400">{icon}</div>}
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

