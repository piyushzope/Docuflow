'use client';

/**
 * Consolidated skeleton loader components
 * Use these for consistent loading states across the app
 */

interface SkeletonProps {
  className?: string;
}

/**
 * Basic text line skeleton
 */
export function SkeletonLine({ className = '' }: SkeletonProps) {
  return (
    <div className={`h-4 bg-gray-200 rounded animate-pulse ${className}`} />
  );
}

/**
 * Multi-line text skeleton
 */
export function SkeletonText({ lines = 3, className = '' }: { lines?: number } & SkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          className={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
}

/**
 * Card skeleton for list items
 */
export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm animate-pulse ${className}`}>
      <div className="space-y-4">
        <div className="h-5 bg-gray-200 rounded w-1/3" />
        <div className="space-y-2">
          <SkeletonLine />
          <SkeletonLine className="w-5/6" />
          <SkeletonLine className="w-4/6" />
        </div>
        <div className="flex gap-2 mt-4">
          <div className="h-8 bg-gray-200 rounded w-20" />
          <div className="h-8 bg-gray-200 rounded w-20" />
        </div>
      </div>
    </div>
  );
}

/**
 * List of skeleton cards
 */
export function SkeletonList({ items = 5, className = '' }: { items?: number } & SkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/**
 * Table skeleton with header and rows
 */
export function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  className = '' 
}: { rows?: number; columns?: number } & SkeletonProps) {
  return (
    <div className={`overflow-hidden rounded-lg bg-white shadow animate-pulse ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-6 py-3">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded flex-1" />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-4">
            <div className="flex gap-4">
              {Array.from({ length: columns }).map((_, j) => (
                <div key={j} className="h-4 bg-gray-200 rounded flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Table row skeleton (for inline loading in tables)
 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-full" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Form skeleton
 */
export function FormSkeleton({ fields = 4, className = '' }: { fields?: number } & SkeletonProps) {
  return (
    <div className={`space-y-6 rounded-lg bg-white p-6 shadow animate-pulse ${className}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-200 rounded w-full" />
        </div>
      ))}
      <div className="flex justify-end gap-4 mt-6">
        <div className="h-10 bg-gray-200 rounded w-24" />
        <div className="h-10 bg-gray-200 rounded w-24" />
      </div>
    </div>
  );
}

/**
 * Document detail skeleton
 */
export function DocumentDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="h-96 bg-gray-200 rounded" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Document Info */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4">
            <div className="h-5 bg-gray-200 rounded w-1/2" />
            <div className="space-y-3">
              <div>
                <div className="h-3 bg-gray-200 rounded w-1/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
              <div>
                <div className="h-3 bg-gray-200 rounded w-1/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>

          {/* Source Information */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4">
            <div className="h-5 bg-gray-200 rounded w-1/2" />
            <div className="space-y-3">
              <div>
                <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Page header skeleton
 */
export function PageHeaderSkeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-2 animate-pulse" />
      <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
    </div>
  );
}

