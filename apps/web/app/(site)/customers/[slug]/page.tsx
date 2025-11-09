import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { generateCaseStudyMetadata, generateBreadcrumbSchema } from '@/lib/seo';
import { getCaseStudyBySlug, getCaseStudies } from '@/lib/cms';
import { Markdown } from '@/components/site/markdown';
import Script from 'next/script';

// ISR: Revalidate every hour
export const revalidate = 3600;

// Generate static params for case studies at build time
export async function generateStaticParams() {
  try {
    const caseStudies = await getCaseStudies({ limit: 50 });
    return caseStudies.map((caseStudy) => ({
      slug: caseStudy.slug,
    }));
  } catch (error) {
    console.error('Error generating static params for case studies:', error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const caseStudy = await getCaseStudyBySlug(slug);

  if (!caseStudy) {
    return {
      title: 'Case Study Not Found',
    };
  }

  return generateCaseStudyMetadata(caseStudy);
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const caseStudy = await getCaseStudyBySlug(slug);

  if (!caseStudy) {
    notFound();
  }

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Customers', url: '/customers' },
    { name: caseStudy.title },
  ]);

  return (
    <>
      <article className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          {caseStudy.cover_image_url && (
            <div className="mb-12">
              <Image
                src={caseStudy.cover_image_url}
                alt={caseStudy.title}
                width={1200}
                height={630}
                className="rounded-lg"
                priority
              />
            </div>
          )}
          <header>
            {caseStudy.customer && (
              <p className="text-sm font-medium text-blue-600">{caseStudy.customer.name}</p>
            )}
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              {caseStudy.title}
            </h1>
            {caseStudy.excerpt && (
              <p className="mt-6 text-xl leading-8 text-gray-600">{caseStudy.excerpt}</p>
            )}
          </header>
          <div className="mt-12">
            <Markdown content={caseStudy.content_md} />
          </div>
          {caseStudy.metrics && Object.keys(caseStudy.metrics).length > 0 && (
            <div className="mt-12 border-t border-gray-200 pt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Results</h2>
              <dl className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                {Object.entries(caseStudy.metrics).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-sm font-medium text-gray-500">{key}</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
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

