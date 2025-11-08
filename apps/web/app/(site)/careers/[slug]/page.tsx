import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { generateMetadata as genMeta, generateBreadcrumbSchema } from '@/lib/seo';
import { getJobBySlug, getJobs } from '@/lib/cms';
import { Markdown } from '@/components/site/markdown';
import { format } from 'date-fns';
import Script from 'next/script';

// ISR: Revalidate every hour
export const revalidate = 3600;

// Generate static params for active jobs at build time
export async function generateStaticParams() {
  try {
    const jobs = await getJobs();
    return jobs.slice(0, 50).map((job) => ({
      slug: job.slug,
    }));
  } catch (error) {
    console.error('Error generating static params for jobs:', error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJobBySlug(slug);

  if (!job) {
    return {
      title: 'Job Not Found',
    };
  }

  return genMeta({
    title: `${job.title} - Careers - Docuflow`,
    description: `Join our team as a ${job.title}. ${job.department ? `${job.department} department.` : ''} ${job.location ? `Location: ${job.location}.` : ''}`,
    url: `/careers/${slug}`,
  });
}

export default async function JobPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);

  if (!job) {
    notFound();
  }

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Careers', url: '/careers' },
    { name: job.title },
  ]);

  return (
    <>
      <article className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <header>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              {job.title}
            </h1>
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-600">
              {job.department && <span>{job.department}</span>}
              {job.location && <span>{job.location}</span>}
              {job.employment_type && (
                <span className="capitalize">{job.employment_type.replace('_', ' ')}</span>
              )}
              {job.published_at && (
                <span>Posted {format(new Date(job.published_at), 'MMMM d, yyyy')}</span>
              )}
            </div>
          </header>
          <div className="mt-12">
            <Markdown content={job.description_md} />
          </div>
          {job.requirements_md && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Requirements</h2>
              <Markdown content={job.requirements_md} />
            </div>
          )}
          <div className="mt-12">
            {job.application_url ? (
              <a
                href={job.application_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Apply for this position
                <span className="ml-2">→</span>
              </a>
            ) : (
              <a
                href={`/contact?subject=${encodeURIComponent(`Job Application: ${job.title}`)}`}
                className="inline-flex items-center rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Apply via Contact Form
                <span className="ml-2">→</span>
              </a>
            )}
          </div>
        </div>
      </article>
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

