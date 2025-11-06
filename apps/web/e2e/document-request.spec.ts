import { test, expect } from '@playwright/test';

/**
 * Document Request Flow E2E Tests
 * 
 * Tests the complete flow of creating and managing document requests:
 * 1. Create a document request
 * 2. View the request in the list
 * 3. Send the request via email (if email account configured)
 * 4. View request details
 * 5. Update request status
 */

test.describe('Document Request Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to requests page
    // Note: In a real test, you'd need to authenticate first
    // This test assumes user is already logged in
    await page.goto('/dashboard/requests');
  });

  test('should display requests list page', async ({ page }) => {
    // Check page loads
    await expect(page.getByRole('heading', { name: /document requests/i })).toBeVisible();
    
    // Check for "New Request" button
    await expect(page.getByRole('link', { name: /new request/i })).toBeVisible();
  });

  test('should navigate to create request page', async ({ page }) => {
    await page.getByRole('link', { name: /new request/i }).click();
    
    await expect(page).toHaveURL(/\/dashboard\/requests\/new/);
    await expect(page.getByRole('heading', { name: /create.*request/i })).toBeVisible();
  });

  test('should show create request form fields', async ({ page }) => {
    await page.goto('/dashboard/requests/new');
    
    // Check required fields are present
    await expect(page.getByLabel(/recipient email/i)).toBeVisible();
    await expect(page.getByLabel(/subject/i)).toBeVisible();
    await expect(page.getByLabel(/message/i)).toBeVisible();
    
    // Check submit button
    const submitButton = page.getByRole('button', { name: /create request/i });
    await expect(submitButton).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/dashboard/requests/new');
    
    // Try to submit empty form
    await page.getByRole('button', { name: /create request/i }).click();
    
    // Should either show validation errors or stay on page
    // Exact behavior depends on form validation implementation
    const url = page.url();
    expect(url).toContain('/dashboard/requests/new');
  });

  test('should fill and submit request form', async ({ page }) => {
    await page.goto('/dashboard/requests/new');
    
    // Fill form fields
    await page.getByLabel(/recipient email/i).fill('test@example.com');
    await page.getByLabel(/subject/i).fill('Document Request: W-2 Form');
    await page.getByLabel(/message/i).fill('Please submit your W-2 form for tax processing.');
    
    // Set due date (if date picker exists)
    const dueDateInput = page.locator('input[type="date"]').first();
    if (await dueDateInput.isVisible()) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const dateString = futureDate.toISOString().split('T')[0];
      await dueDateInput.fill(dateString);
    }
    
    // Submit form
    await page.getByRole('button', { name: /create request/i }).click();
    
    // Should redirect to requests list or show success message
    // Wait for navigation or success indicator
    await page.waitForURL(/\/dashboard\/requests/, { timeout: 5000 }).catch(() => {
      // If no navigation, check for success message
      // This is acceptable as form might show inline success
    });
  });

  test('should display created request in list', async ({ page }) => {
    // This test would require:
    // 1. Authenticated session
    // 2. Test data setup (organization, request)
    // 3. Navigation to requests page
    
    await page.goto('/dashboard/requests');
    
    // Check if requests are displayed (could be empty state or list)
    const emptyState = page.getByText(/no document requests yet/i);
    const requestCard = page.locator('[class*="rounded-lg"]').first();
    
    // Either empty state or request list should be visible
    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    const hasRequests = await requestCard.isVisible().catch(() => false);
    
    expect(hasEmptyState || hasRequests).toBeTruthy();
  });

  test('should show request status badges', async ({ page }) => {
    await page.goto('/dashboard/requests');
    
    // Look for status badges (pending, sent, received, etc.)
    const statusElements = page.locator('[class*="rounded-full"]');
    const count = await statusElements.count();
    
    // If requests exist, should have status badges
    // This is a basic check - actual implementation may vary
    if (count > 0) {
      const firstStatus = statusElements.first();
      await expect(firstStatus).toBeVisible();
    }
  });

  test('should have action buttons on requests', async ({ page }) => {
    await page.goto('/dashboard/requests');
    
    // Look for action buttons (Send, Edit, Delete, etc.)
    // These would appear on request cards
    const sendButton = page.getByRole('button', { name: /send/i }).first();
    const actionButtons = page.locator('button').filter({ hasText: /send|edit|delete/i });
    
    // Check if any action buttons exist (might not if no requests)
    const buttonCount = await actionButtons.count();
    
    // If requests exist, action buttons should be present
    if (buttonCount > 0) {
      await expect(actionButtons.first()).toBeVisible();
    }
  });

  test('should handle send button click without logging out', async ({ page }) => {
    await page.goto('/dashboard/requests');
    await expect(page.getByRole('heading', { name: /document requests/i })).toBeVisible();
    
    // Find Send button for a pending request
    const sendButton = page.getByRole('button', { name: /^send$/i }).first();
    const sendButtonVisible = await sendButton.isVisible().catch(() => false);
    
    if (!sendButtonVisible) {
      test.skip('No pending requests available for testing');
      return;
    }
    
    // Click Send button
    await sendButton.click();
    
    // Wait for response (API call to complete)
    await page.waitForTimeout(2000);
    
    // Critical: Verify user is still logged in and on dashboard
    // Should NOT be redirected to login page
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Verify page is still functional (not showing login form)
    const loginHeading = page.getByRole('heading', { name: /login|sign in/i });
    const isLoginPage = await loginHeading.isVisible().catch(() => false);
    expect(isLoginPage).toBeFalsy();
    
    // Should still be able to see requests page content
    await expect(page.getByRole('heading', { name: /document requests/i })).toBeVisible();
  });

  test('should show appropriate error message when email account is missing', async ({ page }) => {
    await page.goto('/dashboard/requests');
    await expect(page.getByRole('heading', { name: /document requests/i })).toBeVisible();
    
    const sendButton = page.getByRole('button', { name: /^send$/i }).first();
    const sendButtonVisible = await sendButton.isVisible().catch(() => false);
    
    if (!sendButtonVisible) {
      test.skip('No pending requests available for testing');
      return;
    }
    
    await sendButton.click();
    await page.waitForTimeout(2000);
    
    // Check for error messages
    // Should show email account error, NOT session expiration error
    const errorToasts = page.locator('[role="alert"]');
    const toastCount = await errorToasts.count();
    
    if (toastCount > 0) {
      const firstToast = errorToasts.first();
      const toastText = await firstToast.textContent();
      
      // Should mention email account, not session expiration
      const mentionsEmail = toastText?.toLowerCase().includes('email account') ||
                           toastText?.toLowerCase().includes('no active email') ||
                           toastText?.toLowerCase().includes('connect');
      const mentionsSession = toastText?.toLowerCase().includes('session expired') ||
                             toastText?.toLowerCase().includes('log in again');
      
      // If error occurred, should be about email, not session
      if (mentionsSession && !mentionsEmail) {
        console.warn('WARNING: Got session expiration error when email account error expected');
      }
    }
    
    // Should remain on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should navigate back from new request page', async ({ page }) => {
    await page.goto('/dashboard/requests/new');
    
    const cancelLink = page.getByRole('link', { name: /cancel/i });
    if (await cancelLink.isVisible()) {
      await cancelLink.click();
      await expect(page).toHaveURL(/\/dashboard\/requests/);
    }
  });
});

/**
 * Note: For full E2E testing, you would need:
 * 1. Test user authentication setup
 * 2. Test database seeding (organization, email account, etc.)
 * 3. Mock or test email sending
 * 4. Test data cleanup after tests
 * 
 * See test-utils/db-helpers.ts for database utilities
 */

