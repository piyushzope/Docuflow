import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  
  // Check that page loaded
  await expect(page).toHaveTitle(/Docuflow/i);
});

