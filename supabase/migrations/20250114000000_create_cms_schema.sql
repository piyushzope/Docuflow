-- CMS Schema for Marketing Site
-- Creates tables for blog posts, case studies, FAQs, changelog, status, and more
-- Includes RLS policies, indexes, and full-text search support

-- Enable extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- AUTHORS
-- ============================================================================
CREATE TABLE public.cms_authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  bio TEXT,
  avatar_url TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cms_authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read authors"
  ON public.cms_authors FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- CATEGORIES
-- ============================================================================
CREATE TABLE public.cms_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cms_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read categories"
  ON public.cms_categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- TAGS
-- ============================================================================
CREATE TABLE public.cms_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cms_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read tags"
  ON public.cms_tags FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- BLOG POSTS
-- ============================================================================
CREATE TABLE public.cms_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content_md TEXT NOT NULL,
  cover_image_url TEXT,
  author_id UUID REFERENCES public.cms_authors(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.cms_categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  seo_title TEXT,
  seo_description TEXT,
  reading_time_minutes INTEGER,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search support for posts
ALTER TABLE public.cms_posts
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(excerpt, '') || ' ' ||
      coalesce(content_md, '')
    )
  ) STORED;

CREATE INDEX idx_cms_posts_search ON public.cms_posts USING GIN (search_vector);
CREATE INDEX idx_cms_posts_published ON public.cms_posts (published_at DESC) WHERE status = 'published';
CREATE INDEX idx_cms_posts_category ON public.cms_posts (category_id, published_at DESC) WHERE status = 'published';
CREATE INDEX idx_cms_posts_slug ON public.cms_posts (slug);

ALTER TABLE public.cms_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published posts"
  ON public.cms_posts FOR SELECT
  TO anon, authenticated
  USING (status = 'published' AND published_at IS NOT NULL AND published_at <= NOW());

-- ============================================================================
-- POST TAGS (Many-to-Many)
-- ============================================================================
CREATE TABLE public.cms_post_tags (
  post_id UUID REFERENCES public.cms_posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.cms_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

ALTER TABLE public.cms_post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read post tags"
  ON public.cms_post_tags FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cms_posts
      WHERE id = post_id
      AND status = 'published'
      AND published_at IS NOT NULL
      AND published_at <= NOW()
    )
  );

-- ============================================================================
-- CUSTOMERS
-- ============================================================================
CREATE TABLE public.cms_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  industry TEXT,
  description TEXT,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cms_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read customers"
  ON public.cms_customers FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- TESTIMONIALS
-- ============================================================================
CREATE TABLE public.cms_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.cms_customers(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_title TEXT,
  author_avatar_url TEXT,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cms_testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read testimonials"
  ON public.cms_testimonials FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- CASE STUDIES
-- ============================================================================
CREATE TABLE public.cms_case_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content_md TEXT NOT NULL,
  cover_image_url TEXT,
  customer_id UUID REFERENCES public.cms_customers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  seo_title TEXT,
  seo_description TEXT,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search support for case studies
ALTER TABLE public.cms_case_studies
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(excerpt, '') || ' ' ||
      coalesce(content_md, '')
    )
  ) STORED;

CREATE INDEX idx_cms_case_studies_search ON public.cms_case_studies USING GIN (search_vector);
CREATE INDEX idx_cms_case_studies_published ON public.cms_case_studies (published_at DESC) WHERE status = 'published';
CREATE INDEX idx_cms_case_studies_slug ON public.cms_case_studies (slug);

ALTER TABLE public.cms_case_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published case studies"
  ON public.cms_case_studies FOR SELECT
  TO anon, authenticated
  USING (status = 'published' AND published_at IS NOT NULL AND published_at <= NOW());

-- ============================================================================
-- INTEGRATIONS
-- ============================================================================
CREATE TABLE public.cms_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  content_md TEXT,
  logo_url TEXT,
  website_url TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cms_integrations_published ON public.cms_integrations (published_at DESC) WHERE status = 'published';
CREATE INDEX idx_cms_integrations_slug ON public.cms_integrations (slug);

ALTER TABLE public.cms_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published integrations"
  ON public.cms_integrations FOR SELECT
  TO anon, authenticated
  USING (status = 'published' AND published_at IS NOT NULL AND published_at <= NOW());

-- ============================================================================
-- CHANGELOG
-- ============================================================================
CREATE TABLE public.cms_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_md TEXT,
  version TEXT,
  release_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cms_changelog_published ON public.cms_changelog (published_at DESC) WHERE status = 'published';
CREATE INDEX idx_cms_changelog_slug ON public.cms_changelog (slug);
CREATE INDEX idx_cms_changelog_release_date ON public.cms_changelog (release_date DESC) WHERE status = 'published';

ALTER TABLE public.cms_changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published changelog"
  ON public.cms_changelog FOR SELECT
  TO anon, authenticated
  USING (status = 'published' AND published_at IS NOT NULL AND published_at <= NOW());

-- ============================================================================
-- STATUS COMPONENTS
-- ============================================================================
CREATE TABLE public.cms_status_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'operational' CHECK (status IN ('operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cms_status_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read status components"
  ON public.cms_status_components FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- STATUS INCIDENTS
-- ============================================================================
CREATE TABLE public.cms_status_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  impact TEXT CHECK (impact IN ('none', 'minor', 'major', 'critical')),
  component_id UUID REFERENCES public.cms_status_components(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cms_status_incidents_component ON public.cms_status_incidents (component_id);
CREATE INDEX idx_cms_status_incidents_status ON public.cms_status_incidents (status, started_at DESC);

ALTER TABLE public.cms_status_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read status incidents"
  ON public.cms_status_incidents FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- FAQ
-- ============================================================================
CREATE TABLE public.cms_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  display_order INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search support for FAQ
ALTER TABLE public.cms_faq
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(question, '') || ' ' ||
      coalesce(answer, '')
    )
  ) STORED;

CREATE INDEX idx_cms_faq_search ON public.cms_faq USING GIN (search_vector);
CREATE INDEX idx_cms_faq_published ON public.cms_faq (display_order, published_at DESC) WHERE status = 'published';

ALTER TABLE public.cms_faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published FAQ"
  ON public.cms_faq FOR SELECT
  TO anon, authenticated
  USING (status = 'published' AND published_at IS NOT NULL AND published_at <= NOW());

-- ============================================================================
-- CONTACT REQUESTS
-- ============================================================================
CREATE TABLE public.cms_contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  source TEXT,
  ip_address INET,
  user_agent TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cms_contact_requests_status ON public.cms_contact_requests (status, created_at DESC);
CREATE INDEX idx_cms_contact_requests_email ON public.cms_contact_requests (email);

ALTER TABLE public.cms_contact_requests ENABLE ROW LEVEL SECURITY;

-- Only allow inserts from anonymous users (contact form)
CREATE POLICY "Public can insert contact requests"
  ON public.cms_contact_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No public reads (admin only via service role)
CREATE POLICY "No public reads on contact requests"
  ON public.cms_contact_requests FOR SELECT
  TO anon, authenticated
  USING (false);

-- ============================================================================
-- JOBS (for Careers page)
-- ============================================================================
CREATE TABLE public.cms_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  department TEXT,
  location TEXT,
  employment_type TEXT CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'internship')),
  description_md TEXT NOT NULL,
  requirements_md TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  published_at TIMESTAMPTZ,
  application_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cms_jobs_published ON public.cms_jobs (published_at DESC) WHERE status = 'published';
CREATE INDEX idx_cms_jobs_slug ON public.cms_jobs (slug);

ALTER TABLE public.cms_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published jobs"
  ON public.cms_jobs FOR SELECT
  TO anon, authenticated
  USING (status = 'published' AND published_at IS NOT NULL AND published_at <= NOW());

-- ============================================================================
-- VIEWS FOR AGGREGATIONS
-- ============================================================================

-- Related posts by tags/category
CREATE OR REPLACE VIEW public.cms_related_posts AS
SELECT DISTINCT
  p2.id,
  p2.slug,
  p2.title,
  p2.excerpt,
  p2.cover_image_url,
  p2.published_at,
  COUNT(*) as relevance_score
FROM public.cms_posts p1
JOIN public.cms_post_tags pt1 ON pt1.post_id = p1.id
JOIN public.cms_post_tags pt2 ON pt2.tag_id = pt1.tag_id AND pt2.post_id != p1.id
JOIN public.cms_posts p2 ON p2.id = pt2.post_id
WHERE p1.status = 'published'
  AND p2.status = 'published'
  AND p1.published_at IS NOT NULL
  AND p2.published_at IS NOT NULL
  AND p1.published_at <= NOW()
  AND p2.published_at <= NOW()
GROUP BY p2.id, p2.slug, p2.title, p2.excerpt, p2.cover_image_url, p2.published_at
ORDER BY relevance_score DESC, p2.published_at DESC;

-- Trending case studies (last 30 days)
CREATE OR REPLACE VIEW public.cms_trending_case_studies AS
SELECT
  cs.*,
  c.name as customer_name,
  c.logo_url as customer_logo
FROM public.cms_case_studies cs
LEFT JOIN public.cms_customers c ON c.id = cs.customer_id
WHERE cs.status = 'published'
  AND cs.published_at IS NOT NULL
  AND cs.published_at <= NOW()
  AND cs.published_at >= NOW() - INTERVAL '30 days'
ORDER BY cs.published_at DESC;

-- Recent changelog entries
CREATE OR REPLACE VIEW public.cms_recent_changelog AS
SELECT *
FROM public.cms_changelog
WHERE status = 'published'
  AND published_at IS NOT NULL
  AND published_at <= NOW()
ORDER BY published_at DESC
LIMIT 20;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_cms_authors_updated_at
  BEFORE UPDATE ON public.cms_authors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_categories_updated_at
  BEFORE UPDATE ON public.cms_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_posts_updated_at
  BEFORE UPDATE ON public.cms_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_customers_updated_at
  BEFORE UPDATE ON public.cms_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_testimonials_updated_at
  BEFORE UPDATE ON public.cms_testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_case_studies_updated_at
  BEFORE UPDATE ON public.cms_case_studies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_integrations_updated_at
  BEFORE UPDATE ON public.cms_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_changelog_updated_at
  BEFORE UPDATE ON public.cms_changelog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_status_components_updated_at
  BEFORE UPDATE ON public.cms_status_components
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_status_incidents_updated_at
  BEFORE UPDATE ON public.cms_status_incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_faq_updated_at
  BEFORE UPDATE ON public.cms_faq
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_contact_requests_updated_at
  BEFORE UPDATE ON public.cms_contact_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_jobs_updated_at
  BEFORE UPDATE ON public.cms_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

