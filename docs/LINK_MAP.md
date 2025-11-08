# Link Map - Marketing Site

This document tracks all internal links in the marketing site to ensure no 404 errors.

## Navigation Links

### Navbar (`components/site/navbar.tsx`)
- `/` - Home ✓
- `/features` - Features ✓
- `/solutions` - Solutions ✓
- `/pricing` - Pricing ✓
- `/customers` - Customers ✓
- `/resources` - Resources ✓
- `/about` - About ✓
- `/contact` - Contact ✓
- `/login` - Login (existing) ✓

### Footer (`components/site/footer.tsx`)
- `/features` - Features ✓
- `/solutions` - Solutions ✓
- `/pricing` - Pricing ✓
- `/integrations` - Integrations ✓
- `/how-it-works` - How It Works ✓
- `/about` - About ✓
- `/customers` - Customers ✓
- `/careers` - Careers ✓
- `/changelog` - Changelog ✓
- `/status` - Status ✓
- `/resources` - Resources ✓
- `/support` - Support ✓
- `/faq` - FAQ ✓
- `/contact` - Contact ✓
- `/legal/privacy` - Privacy ✓
- `/legal/terms` - Terms ✓

## Page Links

### Home (`app/(site)/page.tsx`)
- `/signup` - Signup (existing) ✓
- `/how-it-works` - How It Works ✓
- `/contact` - Contact ✓

### Features (`app/(site)/features/page.tsx`)
- `/solutions/hr` - HR Solution ✓
- `/solutions/compliance` - Compliance Solution ✓
- `/integrations` - Integrations ✓
- `/signup` - Signup ✓
- `/contact` - Contact ✓

### Solutions (`app/(site)/solutions/page.tsx`)
- `/solutions/hr` - HR Solution ✓
- `/solutions/compliance` - Compliance Solution ✓
- `/solutions/healthcare` - Healthcare Solution ✓
- `/solutions/education` - Education Solution ✓
- `/solutions/financial` - Financial Solution ✓
- `/solutions/real-estate` - Real Estate Solution ✓

### Pricing (`app/(site)/pricing/page.tsx`)
- `/signup` - Signup ✓
- `/contact` - Contact ✓

### Customers (`app/(site)/customers/page.tsx`)
- `/customers/[slug]` - Case Study Detail (dynamic) ✓

### Integrations (`app/(site)/integrations/page.tsx`)
- `/integrations/[slug]` - Integration Detail (dynamic) ✓

### Resources (`app/(site)/resources/page.tsx`)
- `/resources/[slug]` - Post Detail (dynamic) ✓

### Security (`app/(site)/security/page.tsx`)
- `/contact` - Contact ✓
- `/legal/privacy` - Privacy ✓
- `/solutions/healthcare` - Healthcare Solution ✓

### About (`app/(site)/about/page.tsx`)
- `/careers` - Careers ✓

### Careers (`app/(site)/careers/page.tsx`)
- `/careers/[slug]` - Job Detail (dynamic) ✓
- `/contact` - Contact ✓

### Careers Detail (`app/(site)/careers/[slug]/page.tsx`)
- `/contact?subject=...` - Contact with subject (dynamic) ✓

### Contact (`app/(site)/contact/page.tsx`)
- `/contact/success` - Success page ✓

### FAQ (`app/(site)/faq/page.tsx`)
- `/contact` - Contact ✓

### Support (`app/(site)/support/page.tsx`)
- `/resources` - Resources ✓
- `/faq` - FAQ ✓
- `/contact` - Contact ✓
- `/status` - Status ✓
- `/changelog` - Changelog ✓
- `/security` - Security ✓

### Legal (`app/(site)/legal/*/page.tsx`)
- `/contact` - Contact ✓

### Solutions Detail (`app/(site)/solutions/[slug]/page.tsx`)
- `/features` - Features ✓
- `/signup` - Signup ✓
- `/contact` - Contact ✓

## Status

All links verified and routes exist. No 404 errors detected.

## Dynamic Routes

The following routes are dynamic and depend on CMS content:
- `/customers/[slug]` - Requires case study with matching slug
- `/integrations/[slug]` - Requires integration with matching slug
- `/resources/[slug]` - Requires post with matching slug
- `/careers/[slug]` - Requires job with matching slug
- `/changelog/[slug]` - Requires changelog entry with matching slug

All dynamic routes return 404 if content doesn't exist (handled by `notFound()`).

