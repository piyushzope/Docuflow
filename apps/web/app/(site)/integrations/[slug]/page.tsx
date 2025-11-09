import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { generateMetadata as genMeta, generateBreadcrumbSchema } from '@/lib/seo';
import { getIntegrationBySlug, getIntegrations } from '@/lib/cms';
import { Markdown } from '@/components/site/markdown';
import Script from 'next/script';

// ISR: Revalidate every 2 hours
export const revalidate = 7200;

// Generate static params for integrations at build time
export async function generateStaticParams() {
  try {
    const integrations = await getIntegrations();
    return integrations.map((integration) => ({
      slug: integration.slug,
    }));
  } catch (error) {
    console.error('Error generating static params for integrations:', error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const integration = await getIntegrationBySlug(slug);

  if (!integration) {
    return {
      title: 'Integration Not Found',
    };
  }

  return genMeta({
    title: `${integration.name} Integration - Docuflow`,
    description: integration.description || `Learn how to integrate ${integration.name} with Docuflow.`,
    url: `/integrations/${slug}`,
  });
}

export default async function IntegrationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const integration = await getIntegrationBySlug(slug);

  if (!integration) {
    notFound();
  }

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Integrations', url: '/integrations' },
    { name: integration.name },
  ]);

  return (
    <>
      <article className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <header>
            {integration.logo_url && (
              <div className="mb-8">
                <Image
                  src={integration.logo_url}
                  alt={integration.name}
                  width={200}
                  height={80}
                  className="h-20 w-auto"
                />
              </div>
            )}
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              {integration.name} Integration
            </h1>
            {integration.description && (
              <p className="mt-6 text-xl leading-8 text-gray-600">{integration.description}</p>
            )}
          </header>
          {integration.content_md && (
            <div className="mt-12">
              <Markdown content={integration.content_md} />
            </div>
          )}
          
          {/* How to Connect Section */}
          <div className="mt-12 border-t border-gray-200 pt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">How to Connect</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                  1
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Navigate to Integrations</h3>
                  <p className="mt-1 text-gray-600">Go to your dashboard and click on the Integrations section.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                  2
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Select {integration.name}</h3>
                  <p className="mt-1 text-gray-600">Find {integration.name} in the integrations list and click "Connect".</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                  3
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Authorize Access</h3>
                  <p className="mt-1 text-gray-600">You'll be redirected to {integration.name} to authorize Docuflow access. Follow the prompts to complete the connection.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                  4
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Configure Settings</h3>
                  <p className="mt-1 text-gray-600">Once connected, configure your routing rules and preferences in the integration settings.</p>
                </div>
              </div>
            </div>
          </div>

          {integration.website_url && (
            <div className="mt-12">
              <a
                href={integration.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Visit {integration.name} website
                <span className="ml-2">→</span>
              </a>
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

