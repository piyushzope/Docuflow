import type { Metadata } from 'next';
import { generateMetadata as genMeta } from '@/lib/seo';
import { getPosts, getCategories, getTags } from '@/lib/cms';
import { ResourcesPageClient } from '@/components/site/resources-page-client';

export const metadata: Metadata = genMeta({
  title: 'Resources - Docuflow',
  description: 'Blog posts, guides, and resources to help you get the most out of Docuflow.',
});

export default async function ResourcesPage() {
  const [posts, categories, tags] = await Promise.all([
    getPosts(),
    getCategories(),
    getTags(),
  ]);

  return <ResourcesPageClient posts={posts} categories={categories} tags={tags} />;
}

