// CMS Data Fetchers for Marketing Site
// Server-side only, uses Supabase server client with RLS
// Implements ISR caching with revalidate tags

import { createClient } from '@/lib/supabase/server';
import type {
  Post,
  Author,
  Category,
  Tag,
  CaseStudy,
  Customer,
  Testimonial,
  Integration,
  ChangelogEntry,
  StatusComponent,
  StatusIncident,
  FAQ,
  Job,
  RelatedPost,
  TrendingCaseStudy,
} from '@/types/cms';

// Cache configuration
const CACHE_TAGS = {
  posts: 'cms-posts',
  caseStudies: 'cms-case-studies',
  integrations: 'cms-integrations',
  changelog: 'cms-changelog',
  faq: 'cms-faq',
  jobs: 'cms-jobs',
  customers: 'cms-customers',
  testimonials: 'cms-testimonials',
  status: 'cms-status',
} as const;

const REVALIDATE_TIMES = {
  posts: 3600, // 1 hour
  caseStudies: 3600,
  integrations: 7200, // 2 hours
  changelog: 1800, // 30 minutes
  faq: 7200,
  jobs: 3600,
  customers: 7200,
  testimonials: 7200,
  status: 60, // 1 minute (status page needs frequent updates)
} as const;

// Helper to get fetch options with caching
function getFetchOptions(tag: string, revalidate: number) {
  return {
    next: {
      revalidate,
      tags: [tag],
    },
  };
}

// ============================================================================
// POSTS
// ============================================================================

export async function getPosts(options?: {
  limit?: number;
  offset?: number;
  categoryId?: string;
  tagId?: string;
  search?: string;
}): Promise<Post[]> {
  const supabase = await createClient();
  let query = supabase
    .from('cms_posts')
    .select(`
      *,
      author:cms_authors(*),
      category:cms_categories(*),
      tags:cms_post_tags(
        tag:cms_tags(*)
      )
    `)
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false });

  if (options?.categoryId) {
    query = query.eq('category_id', options.categoryId);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  if (options?.search) {
    query = query.textSearch('search_vector', options.search, {
      type: 'websearch',
      config: 'english',
    });
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching posts:', error);
    return [];
  }

  // Transform the data to flatten tags
  return (data || []).map((post: any) => ({
    ...post,
    tags: post.tags?.map((pt: any) => pt.tag).filter(Boolean) || [],
  }));
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cms_posts')
    .select(`
      *,
      author:cms_authors(*),
      category:cms_categories(*),
      tags:cms_post_tags(
        tag:cms_tags(*)
      )
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return {
    ...data,
    tags: data.tags?.map((pt: any) => pt.tag).filter(Boolean) || [],
  };
}

export async function getRelatedPosts(postSlug: string, limit: number = 3): Promise<RelatedPost[]> {
  const supabase = await createClient();
  
  // First get the post to find its ID
  const post = await getPostBySlug(postSlug);
  if (!post) {
    return [];
  }

  // Get posts with same tags or category
  let query = supabase
    .from('cms_posts')
    .select('id, slug, title, excerpt, cover_image_url, published_at')
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .neq('id', post.id)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (post.category_id) {
    query = query.eq('category_id', post.category_id);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data.map(p => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    cover_image_url: p.cover_image_url,
    published_at: p.published_at,
    relevance_score: 1, // Simple relevance for now
  }));
}

// ============================================================================
// AUTHORS
// ============================================================================

export async function getAuthor(id: string): Promise<Author | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cms_authors')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

// ============================================================================
// CATEGORIES
// ============================================================================

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cms_categories')
    .select('*')
    .order('name');

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cms_categories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

// ============================================================================
// TAGS
// ============================================================================

export async function getTags(): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cms_tags')
    .select('*')
    .order('name');

  if (error || !data) {
    return [];
  }

  return data;
}

// ============================================================================
// CASE STUDIES
// ============================================================================

export async function getCaseStudies(options?: {
  limit?: number;
  featured?: boolean;
}): Promise<CaseStudy[]> {
  const supabase = await createClient();
  let query = supabase
    .from('cms_case_studies')
    .select(`
      *,
      customer:cms_customers(*)
    `)
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getCaseStudyBySlug(slug: string): Promise<CaseStudy | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cms_case_studies')
    .select(`
      *,
      customer:cms_customers(*)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getTrendingCaseStudies(limit: number = 5): Promise<TrendingCaseStudy[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cms_trending_case_studies')
    .select('*')
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data as TrendingCaseStudy[];
}

// ============================================================================
// CUSTOMERS
// ============================================================================

export async function getCustomers(options?: {
  featured?: boolean;
}): Promise<Customer[]> {
  const supabase = await createClient();
  let query = supabase
    .from('cms_customers')
    .select('*')
    .order('name');

  if (options?.featured) {
    query = query.eq('featured', true);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getCustomerBySlug(slug: string): Promise<Customer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cms_customers')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

// ============================================================================
// TESTIMONIALS
// ============================================================================

export async function getTestimonials(options?: {
  featured?: boolean;
  limit?: number;
}): Promise<Testimonial[]> {
  const supabase = await createClient();
  let query = supabase
    .from('cms_testimonials')
    .select(`
      *,
      customer:cms_customers(*)
    `)
    .order('display_order', { ascending: true });

  if (options?.featured) {
    query = query.eq('featured', true);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data;
}

// ============================================================================
// INTEGRATIONS
// ============================================================================

export async function getIntegrations(): Promise<Integration[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cms_integrations')
    .select('*')
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .order('display_order', { ascending: true })
    .order('name');

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getIntegrationBySlug(slug: string): Promise<Integration | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cms_integrations')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

// ============================================================================
// CHANGELOG
// ============================================================================

export async function getChangelogEntries(options?: {
  limit?: number;
}): Promise<ChangelogEntry[]> {
  const supabase = await createClient();
  let query = supabase
    .from('cms_changelog')
    .select('*')
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getChangelogEntryBySlug(slug: string): Promise<ChangelogEntry | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cms_changelog')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getRecentChangelog(limit: number = 10): Promise<ChangelogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cms_recent_changelog')
    .select('*')
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data as ChangelogEntry[];
}

// ============================================================================
// STATUS
// ============================================================================

export async function getStatusComponents(): Promise<StatusComponent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cms_status_components')
    .select('*')
    .order('name');

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getStatusIncidents(options?: {
  componentId?: string;
  unresolved?: boolean;
}): Promise<StatusIncident[]> {
  const supabase = await createClient();
  let query = supabase
    .from('cms_status_incidents')
    .select(`
      *,
      component:cms_status_components(*)
    `)
    .order('started_at', { ascending: false });

  if (options?.componentId) {
    query = query.eq('component_id', options.componentId);
  }

  if (options?.unresolved) {
    query = query.neq('status', 'resolved');
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data;
}

// ============================================================================
// FAQ
// ============================================================================

export async function getFAQs(options?: {
  category?: string;
  search?: string;
}): Promise<FAQ[]> {
  const supabase = await createClient();
  let query = supabase
    .from('cms_faq')
    .select('*')
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .order('display_order', { ascending: true })
    .order('question');

  if (options?.category) {
    query = query.eq('category', options.category);
  }

  if (options?.search) {
    query = query.textSearch('search_vector', options.search, {
      type: 'websearch',
      config: 'english',
    });
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data;
}

// ============================================================================
// JOBS
// ============================================================================

export async function getJobs(): Promise<Job[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cms_jobs')
    .select('*')
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .order('display_order', { ascending: true })
    .order('title');

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getJobBySlug(slug: string): Promise<Job | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cms_jobs')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

