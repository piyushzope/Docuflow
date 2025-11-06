import { SkeletonList } from '@/components/skeleton-loader';

export default function StorageLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <SkeletonList items={3} />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SkeletonList items={3} />
      </div>
    </div>
  );
}

