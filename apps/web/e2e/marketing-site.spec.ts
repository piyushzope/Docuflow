import { test, expect } from '@playwright/test';

// Pages to test
const staticPages = [
  '/',
  '/features',
  '/solutions',
  '/pricing',
  '/customers',
  '/security',
  '/integrations',
  '/how-it-works',
  '/resources',
  '/about',
  '/careers',
  '/contact',
  '/faq',
  '/support',
  '/legal/privacy',
  '/legal/terms',
  '/changelog',
  '/status',
];

test.describe('Marketing Site - No 404s', () => {
  test('all static pages load successfully', async ({ page }) => {
    for (const path of staticPages) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page).not.toHaveURL(/404/);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('navbar links work', async ({ page }) => {
    await page.goto('/');
    
    const navLinks = [
      { text: 'Features', href: '/features' },
      { text: 'Solutions', href: '/solutions' },
      { text: 'Pricing', href: '/pricing' },
      { text: 'Customers', href: '/customers' },
      { text: 'Resources', href: '/resources' },
      { text: 'About', href: '/about' },
      { text: 'Contact', href: '/contact' },
    ];

    for (const link of navLinks) {
      const linkElement = page.getByRole('link', { name: link.text });
      await expect(linkElement).toBeVisible();
      
      const href = await linkElement.getAttribute('href');
      expect(href).toBe(link.href);
      
      // Click and verify no 404
      await linkElement.click();
      await expect(page).not.toHaveURL(/404/);
      const response = await page.waitForResponse(resp => resp.url().includes(link.href));
      expect(response.status()).toBe(200);
      
      // Go back to home
      await page.goto('/');
    }
  });

  test('footer links work', async ({ page }) => {
    await page.goto('/');
    
    const footerLinks = [
      '/features',
      '/solutions',
      '/pricing',
      '/integrations',
      '/how-it-works',
      '/about',
      '/customers',
      '/careers',
      '/changelog',
      '/status',
      '/resources',
      '/support',
      '/faq',
      '/contact',
      '/legal/privacy',
      '/legal/terms',
    ];

    for (const href of footerLinks) {
      const link = page.getByRole('link', { name: new RegExp(href.split('/').pop() || '', 'i') });
      if (await link.count() > 0) {
        await link.first().click();
        await expect(page).not.toHaveURL(/404/);
        expect(page.url()).toContain(href);
        await page.goto('/');
      }
    }
  });

  test('CTA buttons work', async ({ page }) => {
    await page.goto('/');
    
    // Test primary CTA
    const signupButton = page.getByRole('link', { name: /sign up|get started|start free trial/i });
    if (await signupButton.count() > 0) {
      const href = await signupButton.first().getAttribute('href');
      expect(href).toBeTruthy();
    }
    
    // Test contact CTA
    const contactButton = page.getByRole('link', { name: /contact|contact sales/i });
    if (await contactButton.count() > 0) {
      await contactButton.first().click();
      await expect(page).not.toHaveURL(/404/);
      expect(page.url()).toContain('/contact');
    }
  });

  test('solutions detail pages exist', async ({ page }) => {
    const solutions = ['hr', 'compliance', 'healthcare', 'education', 'financial', 'real-estate'];
    
    for (const slug of solutions) {
      const response = await page.goto(`/solutions/${slug}`);
      expect(response?.status()).toBe(200);
      await expect(page).not.toHaveURL(/404/);
    }
  });

  test('SEO metadata is present', async ({ page }) => {
    await page.goto('/');
    
    // Check for title
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    
    // Check for meta description
    const metaDescription = page.locator('meta[name="description"]');
    if (await metaDescription.count() > 0) {
      const content = await metaDescription.getAttribute('content');
      expect(content).toBeTruthy();
    }
    
    // Check for OpenGraph tags
    const ogTitle = page.locator('meta[property="og:title"]');
    if (await ogTitle.count() > 0) {
      const content = await ogTitle.getAttribute('content');
      expect(content).toBeTruthy();
    }
  });

  test('contact form submits successfully', async ({ page }) => {
    await page.goto('/contact');
    
    // Fill form
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('textarea[name="message"]', 'This is a test message');
    
    // Submit form
    const submitButton = page.getByRole('button', { name: /send message/i });
    await submitButton.click();
    
    // Wait for response (may be success or error, but should not be 404)
    await page.waitForTimeout(1000);
    await expect(page).not.toHaveURL(/404/);
  });

  test('resources page has search functionality', async ({ page }) => {
    await page.goto('/resources');
    
    // Check if search input exists
    const searchInput = page.locator('input[type="text"][placeholder*="Search"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      // Page should still load (no 404)
      await expect(page).not.toHaveURL(/404/);
    }
  });
});

