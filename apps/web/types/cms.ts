// CMS Types for Marketing Site
// These types match the Supabase CMS schema

export type PostStatus = 'draft' | 'published';
export type CaseStudyStatus = 'draft' | 'published';
export type IntegrationStatus = 'draft' | 'published';
export type ChangelogStatus = 'draft' | 'published';
export type FAQStatus = 'draft' | 'published';
export type JobStatus = 'draft' | 'published' | 'closed';
export type ContactRequestStatus = 'new' | 'read' | 'replied' | 'archived';
export type StatusComponentStatus = 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';
export type IncidentImpact = 'none' | 'minor' | 'major' | 'critical';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship';

export interface Author {
  id: string;
  name: string;
  email: string | null;
  bio: string | null;
  avatar_url: string | null;
  social_links: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content_md: string;
  cover_image_url: string | null;
  author_id: string | null;
  category_id: string | null;
  status: PostStatus;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  reading_time_minutes: number | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  author?: Author | null;
  category?: Category | null;
  tags?: Tag[];
}

export interface PostTag {
  post_id: string;
  tag_id: string;
  tag?: Tag;
}

export interface Customer {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
  industry: string | null;
  description: string | null;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  customer_id: string | null;
  author_name: string;
  author_title: string | null;
  author_avatar_url: string | null;
  content: string;
  rating: number | null;
  featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  customer?: Customer | null;
}

export interface CaseStudy {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content_md: string;
  cover_image_url: string | null;
  customer_id: string | null;
  status: CaseStudyStatus;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  metrics: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  customer?: Customer | null;
}

export interface Integration {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  content_md: string | null;
  logo_url: string | null;
  website_url: string | null;
  category: string | null;
  status: IntegrationStatus;
  published_at: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ChangelogEntry {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content_md: string | null;
  version: string | null;
  release_date: string | null;
  status: ChangelogStatus;
  published_at: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface StatusComponent {
  id: string;
  name: string;
  description: string | null;
  status: StatusComponentStatus;
  created_at: string;
  updated_at: string;
}

export interface StatusIncident {
  id: string;
  title: string;
  description: string | null;
  status: IncidentStatus;
  impact: IncidentImpact | null;
  component_id: string | null;
  started_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  component?: StatusComponent | null;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  display_order: number;
  status: FAQStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactRequest {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  source: string | null;
  ip_address: string | null;
  user_agent: string | null;
  status: ContactRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  title: string;
  slug: string;
  department: string | null;
  location: string | null;
  employment_type: EmploymentType | null;
  description_md: string;
  requirements_md: string | null;
  status: JobStatus;
  published_at: string | null;
  application_url: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// View types
export interface RelatedPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  relevance_score: number;
}

export interface TrendingCaseStudy extends CaseStudy {
  customer_name: string | null;
  customer_logo: string | null;
}

