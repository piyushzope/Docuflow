import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { generateMetadata as genMeta } from '@/lib/seo';
import { getIntegrations } from '@/lib/cms';

export const metadata: Metadata = genMeta({
  title: 'Integrations - Docuflow',
  description: 'Connect Docuflow with your favorite tools and services. Gmail, Outlook, Google Drive, OneDrive, and more.',
});

export default async function IntegrationsPage() {
  const integrations = await getIntegrations();

  // Group integrations by category
  const integrationsByCategory = integrations.reduce((acc, integration) => {
    const category = integration.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(integration);
    return acc;
  }, {} as Record<string, typeof integrations>);

  const categories = Object.keys(integrationsByCategory).sort();

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Integrations
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Connect Docuflow with your favorite tools and services to streamline your workflow.
          </p>
        </div>
        
        {categories.map((category) => (
          <div key={category} className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">{category}</h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {integrationsByCategory[category].map((integration) => (
                <Link
                  key={integration.id}
                  href={`/integrations/${integration.slug}`}
                  className="group rounded-2xl bg-gray-50 p-8 hover:bg-gray-100 transition-colors"
                >
                  {integration.logo_url && (
                    <div className="mb-4">
                      <Image
                        src={integration.logo_url}
                        alt={integration.name}
                        width={120}
                        height={48}
                        className="h-12 w-auto"
                      />
                    </div>
                  )}
                  <h3 className="text-lg font-semibold leading-8 text-gray-900 group-hover:text-blue-600">
                    {integration.name}
                  </h3>
                  {integration.description && (
                    <p className="mt-4 text-base leading-7 text-gray-600">{integration.description}</p>
                  )}
                  <span className="mt-4 inline-flex items-center text-sm font-semibold text-blue-600">
                    Learn more <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

