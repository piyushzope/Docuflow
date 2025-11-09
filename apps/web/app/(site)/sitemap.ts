import type { MetadataRoute } from 'next';
import { getPosts, getCaseStudies, getIntegrations, getChangelogEntries, getJobs } from '@/lib/cms';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://docuflow.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/features`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/solutions`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/solutions/hr`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/solutions/compliance`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/solutions/healthcare`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/solutions/education`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/solutions/financial`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/solutions/real-estate`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/contact/success`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/customers`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/security`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/integrations`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/resources`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/careers`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/support`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/changelog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/status`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.5,
    },
  ];

  // Dynamic routes from CMS
  const [posts, caseStudies, integrations, changelogEntries, jobs] = await Promise.all([
    getPosts(),
    getCaseStudies(),
    getIntegrations(),
    getChangelogEntries(),
    getJobs(),
  ]);

  const dynamicRoutes: MetadataRoute.Sitemap = [
    ...posts.map((post) => ({
      url: `${SITE_URL}/resources/${post.slug}`,
      lastModified: post.updated_at ? new Date(post.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...caseStudies.map((caseStudy) => ({
      url: `${SITE_URL}/customers/${caseStudy.slug}`,
      lastModified: caseStudy.updated_at ? new Date(caseStudy.updated_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...integrations.map((integration) => ({
      url: `${SITE_URL}/integrations/${integration.slug}`,
      lastModified: integration.updated_at ? new Date(integration.updated_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...changelogEntries.map((entry) => ({
      url: `${SITE_URL}/changelog/${entry.slug}`,
      lastModified: entry.updated_at ? new Date(entry.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...jobs.map((job) => ({
      url: `${SITE_URL}/careers/${job.slug}`,
      lastModified: job.updated_at ? new Date(job.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];

  return [...staticRoutes, ...dynamicRoutes];
}

