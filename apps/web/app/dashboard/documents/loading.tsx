import { PageHeaderSkeleton, TableSkeleton } from '@/components/skeletons';

export default function DocumentsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeaderSkeleton />
      <TableSkeleton rows={10} columns={7} />
    </div>
  );
}

