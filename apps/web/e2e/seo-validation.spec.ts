import { test, expect } from '@playwright/test';

const pages = [
  { path: '/', title: 'Docuflow' },
  { path: '/features', title: 'Features' },
  { path: '/solutions', title: 'Solutions' },
  { path: '/pricing', title: 'Pricing' },
  { path: '/customers', title: 'Customers' },
  { path: '/security', title: 'Security' },
  { path: '/integrations', title: 'Integrations' },
  { path: '/how-it-works', title: 'How It Works' },
  { path: '/resources', title: 'Resources' },
  { path: '/about', title: 'About' },
  { path: '/careers', title: 'Careers' },
  { path: '/contact', title: 'Contact' },
  { path: '/faq', title: 'FAQ' },
  { path: '/support', title: 'Support' },
  { path: '/legal/privacy', title: 'Privacy' },
  { path: '/legal/terms', title: 'Terms' },
  { path: '/changelog', title: 'Changelog' },
  { path: '/status', title: 'Status' },
];

test.describe('SEO Validation', () => {
  for (const page of pages) {
    test(`${page.path} has proper SEO metadata`, async ({ page: p }) => {
      await p.goto(page.path);
      
      // Title
      const title = await p.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(10);
      expect(title).toContain('Docuflow');
      
      // Meta description
      const metaDescription = p.locator('meta[name="description"]');
      if (await metaDescription.count() > 0) {
        const content = await metaDescription.getAttribute('content');
        expect(content).toBeTruthy();
        expect(content?.length).toBeGreaterThan(50);
      }
      
      // Canonical URL
      const canonical = p.locator('link[rel="canonical"]');
      if (await canonical.count() > 0) {
        const href = await canonical.getAttribute('href');
        expect(href).toBeTruthy();
        expect(href).toContain(page.path);
      }
      
      // OpenGraph title
      const ogTitle = p.locator('meta[property="og:title"]');
      if (await ogTitle.count() > 0) {
        const content = await ogTitle.getAttribute('content');
        expect(content).toBeTruthy();
      }
      
      // OpenGraph description
      const ogDescription = p.locator('meta[property="og:description"]');
      if (await ogDescription.count() > 0) {
        const content = await ogDescription.getAttribute('content');
        expect(content).toBeTruthy();
      }
      
      // Twitter card
      const twitterCard = p.locator('meta[name="twitter:card"]');
      if (await twitterCard.count() > 0) {
        const content = await twitterCard.getAttribute('content');
        expect(content).toBe('summary_large_image');
      }
      
      // JSON-LD (Organization schema should be on all pages)
      const jsonLd = p.locator('script[type="application/ld+json"]');
      const jsonLdCount = await jsonLd.count();
      expect(jsonLdCount).toBeGreaterThan(0);
    });
  }
  
  test('sitemap is accessible', async ({ page }) => {
    const response = await page.goto('/sitemap.xml');
    expect(response?.status()).toBe(200);
    const content = await page.content();
    expect(content).toContain('<?xml');
    expect(content).toContain('<urlset');
  });
  
  test('robots.txt is accessible', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    expect(response?.status()).toBe(200);
    const content = await page.textContent('body');
    expect(content).toContain('User-agent');
    expect(content).toContain('Sitemap');
  });
  
  test('RSS feed is accessible', async ({ page }) => {
    const response = await page.goto('/rss.xml');
    expect(response?.status()).toBe(200);
    const content = await page.content();
    expect(content).toContain('<?xml');
    expect(content).toContain('<rss');
  });
});

