import type { Metadata } from 'next';
import Link from 'next/link';
import { generateMetadata as genMeta } from '@/lib/seo';
import { getChangelogEntries } from '@/lib/cms';
import { format } from 'date-fns';

export const metadata: Metadata = genMeta({
  title: 'Changelog - Docuflow',
  description: 'See what\'s new and what\'s changed in Docuflow.',
});

export default async function ChangelogPage() {
  const entries = await getChangelogEntries();

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Changelog
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            See what's new, what's changed, and what's coming next.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <div className="space-y-12">
            {entries.map((entry) => (
              <article key={entry.id} className="relative">
                <div className="flex items-center gap-x-4 text-xs">
                  {entry.release_date && (
                    <time
                      dateTime={entry.release_date}
                      className="text-gray-500"
                    >
                      {format(new Date(entry.release_date), 'MMMM d, yyyy')}
                    </time>
                  )}
                  {entry.version && (
                    <span className="relative z-10 rounded-full bg-gray-100 px-3 py-1.5 font-medium text-gray-600">
                      {entry.version}
                    </span>
                  )}
                </div>
                <div className="group relative">
                  <h3 className="mt-3 text-lg font-semibold leading-6 text-gray-900">
                    <Link href={`/changelog/${entry.slug}`}>
                      <span className="absolute inset-0" />
                      {entry.title}
                    </Link>
                  </h3>
                  {entry.description && (
                    <p className="mt-5 line-clamp-3 text-sm leading-6 text-gray-600">
                      {entry.description}
                    </p>
                  )}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {entry.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

