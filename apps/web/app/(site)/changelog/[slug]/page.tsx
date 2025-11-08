import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { generateMetadata as genMeta, generateChangelogSchema, generateBreadcrumbSchema } from '@/lib/seo';
import { getChangelogEntryBySlug, getChangelogEntries } from '@/lib/cms';
import { Markdown } from '@/components/site/markdown';
import { format } from 'date-fns';
import Script from 'next/script';

// ISR: Revalidate every 30 minutes (changelog updates frequently)
export const revalidate = 1800;

// Generate static params for recent changelog entries at build time
export async function generateStaticParams() {
  try {
    const entries = await getChangelogEntries({ limit: 50 });
    return entries.map((entry) => ({
      slug: entry.slug,
    }));
  } catch (error) {
    console.error('Error generating static params for changelog:', error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getChangelogEntryBySlug(slug);

  if (!entry) {
    return {
      title: 'Changelog Entry Not Found',
    };
  }

  return genMeta({
    title: `${entry.title} - Changelog - Docuflow`,
    description: entry.description || `Changelog entry: ${entry.title}`,
    url: `/changelog/${slug}`,
  });
}

export default async function ChangelogEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = await getChangelogEntryBySlug(slug);

  if (!entry) {
    notFound();
  }

  const changelogSchema = generateChangelogSchema(entry);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Changelog', url: '/changelog' },
    { name: entry.title },
  ]);

  return (
    <>
      <article className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <header>
            <div className="flex items-center gap-x-4 text-sm">
              {entry.release_date && (
                <time dateTime={entry.release_date} className="text-gray-500">
                  {format(new Date(entry.release_date), 'MMMM d, yyyy')}
                </time>
              )}
              {entry.version && (
                <span className="relative z-10 rounded-full bg-gray-100 px-3 py-1.5 font-medium text-gray-600">
                  {entry.version}
                </span>
              )}
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              {entry.title}
            </h1>
            {entry.description && (
              <p className="mt-6 text-xl leading-8 text-gray-600">{entry.description}</p>
            )}
          </header>
          {entry.content_md && (
            <div className="mt-12">
              <Markdown content={entry.content_md} />
            </div>
          )}
          {entry.tags && entry.tags.length > 0 && (
            <div className="mt-12 border-t border-gray-200 pt-12">
              <h3 className="text-sm font-medium text-gray-900">Tags</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {entry.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
      <Script
        id="changelog-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(changelogSchema),
        }}
      />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
    </>
  );
}

