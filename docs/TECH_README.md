# Technical Documentation - Marketing Site

## Overview

The marketing site is built using Next.js App Router with Supabase as a headless CMS. All content is stored in PostgreSQL with Row-Level Security (RLS) policies ensuring only published content is publicly accessible.

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **CMS**: Supabase PostgreSQL
- **Styling**: Tailwind CSS
- **Markdown**: remark/rehype with sanitization
- **Type Safety**: TypeScript with Zod validation

### Route Structure
- Marketing pages: `app/(site)/*`
- Dashboard: `app/dashboard/*` (existing)
- API routes: `app/(site)/api/*`

## Database Schema

### CMS Tables
All CMS tables are prefixed with `cms_` and located in the `public` schema:

- `cms_authors` - Blog post authors
- `cms_categories` - Post categories
- `cms_tags` - Post tags
- `cms_posts` - Blog posts with full-text search
- `cms_post_tags` - Many-to-many post-tag relationship
- `cms_customers` - Customer logos and info
- `cms_testimonials` - Customer testimonials
- `cms_case_studies` - Case studies with full-text search
- `cms_integrations` - Integration documentation
- `cms_changelog` - Product changelog entries
- `cms_status_components` - Status page components
- `cms_status_incidents` - Status page incidents
- `cms_faq` - FAQ entries with full-text search
- `cms_contact_requests` - Contact form submissions (write-only for public)
- `cms_jobs` - Job postings

### Full-Text Search (FTS)

Three tables have FTS support via generated columns and GIN indexes:
- `cms_posts.search_vector`
- `cms_case_studies.search_vector`
- `cms_faq.search_vector`

Search uses PostgreSQL's `to_tsvector` with English language configuration.

### Views

Precomputed aggregations:
- `cms_related_posts` - Related posts by tags/category
- `cms_trending_case_studies` - Case studies from last 30 days
- `cms_recent_changelog` - Recent changelog entries (last 20)

## Row-Level Security (RLS)

### Public Read Policies
All CMS tables have RLS enabled with policies allowing:
- `anon` and `authenticated` roles can read published content
- Published content must have `status = 'published'` AND `published_at <= NOW()`

### Write Policies
- `cms_contact_requests`: Public can insert (for contact form), but cannot read
- All other tables: Write access restricted to service role (admin operations)

## Data Fetching

### CMS Fetchers (`lib/cms.ts`)
All fetchers:
- Use Supabase server client (RLS-aware)
- Return typed data matching `types/cms.ts`
- Filter for published content automatically
- Include related data via joins (authors, categories, tags, customers)

### Caching Strategy
ISR (Incremental Static Regeneration) is implemented via:
- `fetch` options with `revalidate` times (1 hour for posts, 2 hours for static content)
- Cache tags for on-demand revalidation
- Revalidation endpoint: `/api/revalidate/cms` (requires `REVALIDATE_SECRET`)

## SEO Implementation

### Metadata Generation (`lib/seo.ts`)
- `generateMetadata()` - Base metadata with OpenGraph/Twitter cards
- `generatePostMetadata()` - Article-specific metadata
- `generateCaseStudyMetadata()` - Case study metadata
- Per-page `generateMetadata` exports for dynamic routes

### Structured Data (JSON-LD)
- Organization schema (site-wide)
- Article schema (blog posts)
- Breadcrumb schema (navigation)
- Changelog schema

### SEO Files
- `sitemap.ts` - Dynamic sitemap including all CMS content
- `robots.ts` - Robots.txt with sitemap reference
- `rss.xml/route.ts` - RSS feed for blog posts

## Components

### Site Components (`components/site/`)
- `Navbar` - Responsive navigation with mobile menu
- `Footer` - Site footer with links
- `Hero` - Landing page hero section
- `FeatureGrid` - Feature showcase grid
- `PricingTable` - Pricing tiers
- `LogoCloud` - Customer logo display
- `Testimonials` - Testimonial cards
- `FAQ` - Accordion FAQ component
- `CaseStudyCard` - Case study preview card
- `CTA` - Call-to-action section
- `ContactForm` - Contact form with validation
- `Markdown` - Safe markdown renderer with sanitization

## Security

### Input Validation
- Contact form: Zod schema validation + honeypot field
- API routes: Zod validation for all inputs
- Markdown: Sanitized via `rehype-sanitize` with allowlist

### Rate Limiting
- Contact form: IP-based tracking (stored in database)
- Future: Implement rate limiting middleware

### Content Sanitization
- Markdown content is sanitized before rendering
- Only whitelisted HTML tags and attributes allowed
- Prevents XSS attacks

## Performance

### Image Optimization
- All images use `next/image` with:
  - Responsive sizing
  - Blur placeholders (where applicable)
  - Priority loading for LCP elements

### ISR Caching
- Static pages: 2 hours revalidation
- Blog posts: 1 hour revalidation
- Status page: 1 minute revalidation
- On-demand revalidation via API endpoint

### Bundle Optimization
- Server components by default
- Client components only where needed (forms, interactive elements)
- Code splitting via Next.js automatic optimization

## Analytics

### Plausible Integration
Plausible analytics is integrated in the site layout:
- Loads via `next/script` with `defer`
- Respects Do Not Track (DNT)
- Configured via `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` env var

## Testing

### E2E Tests
Playwright tests for critical flows are located in `apps/web/e2e/`:
- `marketing-site.spec.ts` - Comprehensive link crawl and navigation tests
- `seo-validation.spec.ts` - SEO metadata validation (canonical, OG, JSON-LD)

Run E2E tests:
```bash
cd apps/web
npm run test:e2e
```

Run E2E tests with UI:
```bash
npm run test:e2e:ui
```

### Unit Tests
Unit tests are located in `apps/web/__tests__/`:
- `cms.test.ts` - CMS fetchers with mocked Supabase
- `contact-api.test.ts` - Contact API Zod validation and rate limiting
- `seo.test.ts` - SEO helper functions (metadata, schemas)

Run unit tests:
```bash
cd apps/web
npm test
```

Run unit tests with coverage:
```bash
npm run test:coverage
```

Run unit tests with UI:
```bash
npm run test:ui
```

### Test Setup
Tests use Vitest with jsdom environment. Configuration is in `vitest.config.ts`.

## Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `NEXT_PUBLIC_SITE_URL` - Site URL for SEO (defaults to https://docuflow.com)

Optional:
- `REVALIDATE_SECRET` - Secret token for on-demand revalidation
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` - Plausible analytics domain

## Deployment

### Database Migration
Run the CMS migration:
```bash
node scripts/run-migration.js supabase/migrations/20250114000000_create_cms_schema.sql
```

Or via Supabase CLI:
```bash
supabase db push
```

### On-Demand Revalidation
To revalidate content when CMS is updated, call:
```bash
curl -X POST https://your-site.com/api/revalidate/cms \
  -H "Authorization: Bearer YOUR_REVALIDATE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"tag": "cms-posts"}'
```

### Supabase Webhook (Optional)
Set up a Supabase webhook to automatically revalidate on content updates:
1. Create webhook in Supabase dashboard
2. Point to `/api/revalidate/cms` endpoint
3. Include `REVALIDATE_SECRET` in Authorization header

## Content Management

### Adding Content
Content is managed directly in Supabase:
1. Insert into appropriate CMS table
2. Set `status = 'published'`
3. Set `published_at = NOW()` or future date
4. Call revalidation endpoint (or wait for ISR)

### Content Types
- **Posts**: Blog articles with markdown content
- **Case Studies**: Customer success stories
- **Integrations**: Integration documentation
- **Changelog**: Product updates
- **FAQ**: Frequently asked questions
- **Jobs**: Job postings
- **Status**: System status components and incidents

## Troubleshooting

### Content Not Appearing
1. Check RLS policies - ensure content is published
2. Verify `published_at <= NOW()`
3. Check cache - try on-demand revalidation
4. Verify Supabase connection

### SEO Issues
1. Verify `NEXT_PUBLIC_SITE_URL` is set correctly
2. Check sitemap at `/sitemap.xml`
3. Validate structured data with Google Rich Results Test
4. Check robots.txt at `/robots.txt`

### Performance Issues
1. Check ISR revalidation times
2. Verify image optimization is working
3. Check bundle sizes in Next.js build output
4. Monitor Core Web Vitals

## Future Enhancements

- [ ] Add rate limiting middleware
- [ ] Implement search functionality
- [ ] Add comment system for blog posts
- [ ] Implement newsletter signup
- [ ] Add A/B testing capabilities
- [ ] Enhance analytics tracking
- [ ] Add content preview for drafts
- [ ] Implement content scheduling

