'use client';

/**
 * Legacy skeleton loader components
 * Re-exported from new consolidated skeletons.tsx for backward compatibility
 * @deprecated Use components from '@/components/skeletons' instead
 */

import { SkeletonText, SkeletonCard, SkeletonList } from '@/components/skeletons';

// Backward compatibility wrapper for SkeletonLoader
export function SkeletonLoader({ 
  className = '', 
  lines = 3,
  height = 'h-4'
}: { className?: string; lines?: number; height?: string }) {
  return <SkeletonText lines={lines} className={className} />;
}

export { SkeletonCard, SkeletonList };

// Backward compatibility: SkeletonList with 'count' prop
export function SkeletonListWithCount({ count = 5 }: { count?: number }) {
  return <SkeletonList items={count} />;
}

