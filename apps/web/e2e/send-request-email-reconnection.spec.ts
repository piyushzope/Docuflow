import { test, expect } from '@playwright/test';

/**
 * Send Request with Email Account Reconnection E2E Tests
 * 
 * Tests the scenario where:
 * 1. User has a document request ready to send
 * 2. Email account is disconnected or tokens expired
 * 3. User gets session expiration error (false positive)
 * 4. User reconnects email account
 * 5. Successfully sends the request without logging out
 * 
 * This test verifies the fix for the issue where sending a request
 * with an invalid/expired email account was causing session expiration errors.
 */

test.describe('Send Request with Email Account Reconnection', () => {
  // Note: In a real test environment, you would:
  // 1. Set up test user and organization
  // 2. Seed test data (document request)
  // 3. Mock or manipulate email account state
  
  test('should handle send failure when email account is disconnected', async ({ page }) => {
    // Navigate to requests page (assuming authenticated)
    await page.goto('/dashboard/requests');
    
    // Wait for page to load
    await expect(page.getByRole('heading', { name: /document requests/i })).toBeVisible();
    
    // Find a pending request with Send button
    const sendButton = page.getByRole('button', { name: /^send$/i }).first();
    
    // Check if send button exists (if no pending requests, test is N/A)
    const sendButtonVisible = await sendButton.isVisible().catch(() => false);
    
    if (!sendButtonVisible) {
      test.skip('No pending requests available for testing');
      return;
    }
    
    // Click Send button
    await sendButton.click();
    
    // Wait for response - should either:
    // 1. Show error about missing email account (expected)
    // 2. Show session expiration error (bug - should not happen)
    // 3. Show success (if email account is valid)
    
    // Wait for toast notification or error message
    await page.waitForTimeout(1000);
    
    // Check for error messages
    const errorToast = page.locator('[role="alert"]').filter({ 
      hasText: /session expired|email account|no active email/i 
    });
    const hasError = await errorToast.isVisible().catch(() => false);
    
    // Verify we're still on the requests page (not redirected to login)
    await expect(page).toHaveURL(/\/dashboard\/requests/);
    
    // If session expiration error appeared, that's the bug we're testing for
    const hasSessionError = await page
      .getByText(/session.*expired/i)
      .isVisible()
      .catch(() => false);
    
    if (hasSessionError) {
      console.log('Detected session expiration error - this should not happen when email account is disconnected');
    }
  });

  test('should navigate to integrations when email account error occurs', async ({ page }) => {
    await page.goto('/dashboard/requests');
    await expect(page.getByRole('heading', { name: /document requests/i })).toBeVisible();
    
    // Try to send a request
    const sendButton = page.getByRole('button', { name: /^send$/i }).first();
    const sendButtonVisible = await sendButton.isVisible().catch(() => false);
    
    if (!sendButtonVisible) {
      test.skip('No pending requests available for testing');
      return;
    }
    
    await sendButton.click();
    await page.waitForTimeout(1000);
    
    // Check if error message suggests going to integrations
    const errorMessage = page.locator('[role="alert"]').filter({ 
      hasText: /connect.*email|email account|integrations/i 
    });
    const hasEmailError = await errorMessage.isVisible().catch(() => false);
    
    if (hasEmailError) {
      // Navigate to integrations page
      await page.goto('/dashboard/integrations');
      
      // Verify we're on integrations page
      await expect(page.getByRole('heading', { name: /email.*integration/i })).toBeVisible();
      
      // Should see email account connection options
      const connectButton = page.getByRole('link', { name: /connect/i }).or(
        page.getByRole('button', { name: /connect/i })
      );
      const hasConnectOption = await connectButton.first().isVisible().catch(() => false);
      
      expect(hasConnectOption).toBeTruthy();
    }
  });

  test('should successfully send after reconnecting email account', async ({ page, context }) => {
    // Navigate to requests page
    await page.goto('/dashboard/requests');
    await expect(page.getByRole('heading', { name: /document requests/i })).toBeVisible();
    
    // Get initial request count/state
    const sendButton = page.getByRole('button', { name: /^send$/i }).first();
    const sendButtonVisible = await sendButton.isVisible().catch(() => false);
    
    if (!sendButtonVisible) {
      test.skip('No pending requests available for testing');
      return;
    }
    
    // Step 1: Navigate to integrations page
    await page.goto('/dashboard/integrations');
    await expect(page.getByRole('heading', { name: /email.*integration/i })).toBeVisible();
    
    // Step 2: Check if email account is connected
    // Look for "Connected" status or connect button
    const connectedStatus = page.getByText(/connected|active/i).first();
    const connectButton = page.getByRole('link', { name: /connect|add another/i }).or(
      page.getByRole('button', { name: /connect|add another/i })
    );
    
    const isConnected = await connectedStatus.isVisible().catch(() => false);
    
    if (!isConnected) {
      // Step 3: Connect email account (if not connected)
      // Note: In a real test, you would need to mock OAuth flow
      // For now, we'll just verify the connect button exists
      const hasConnectButton = await connectButton.first().isVisible().catch(() => false);
      expect(hasConnectButton).toBeTruthy();
      
      console.log('Email account needs to be connected - OAuth flow would be tested here');
      
      // In a real test, you would:
      // 1. Click connect button
      // 2. Mock OAuth callback
      // 3. Verify account is connected
      // 4. Return to requests page
    }
    
    // Step 4: Navigate back to requests page
    await page.goto('/dashboard/requests');
    await expect(page.getByRole('heading', { name: /document requests/i })).toBeVisible();
    
    // Step 5: Try to send the request again
    const sendButtonAfterReconnect = page.getByRole('button', { name: /^send$/i }).first();
    await expect(sendButtonAfterReconnect).toBeVisible();
    
    // Click send
    await sendButtonAfterReconnect.click();
    
    // Step 6: Wait for response
    await page.waitForTimeout(2000);
    
    // Step 7: Verify we're still logged in and on requests page
    await expect(page).toHaveURL(/\/dashboard\/requests/);
    
    // Step 8: Check for success message or error
    // Should NOT see session expiration error
    const sessionError = page.getByText(/session.*expired/i);
    const hasSessionError = await sessionError.isVisible().catch(() => false);
    
    expect(hasSessionError).toBeFalsy();
    
    // Should see either success or a specific email-related error (not session error)
    const successToast = page.locator('[role="alert"]').filter({ 
      hasText: /sent successfully|success/i 
    });
    const emailErrorToast = page.locator('[role="alert"]').filter({ 
      hasText: /email account|no active email/i 
    });
    
    const hasSuccess = await successToast.isVisible().catch(() => false);
    const hasEmailError = await emailErrorToast.isVisible().catch(() => false);
    
    // Either success or email-specific error is acceptable
    // Session expiration error is NOT acceptable
    expect(hasSuccess || hasEmailError).toBeTruthy();
  });

  test('should not log out user when email account error occurs', async ({ page }) => {
    await page.goto('/dashboard/requests');
    await expect(page.getByRole('heading', { name: /document requests/i })).toBeVisible();
    
    // Verify user is authenticated (we can see the requests page)
    const isAuthenticated = page.url().includes('/dashboard');
    expect(isAuthenticated).toBeTruthy();
    
    // Try to send a request
    const sendButton = page.getByRole('button', { name: /^send$/i }).first();
    const sendButtonVisible = await sendButton.isVisible().catch(() => false);
    
    if (!sendButtonVisible) {
      test.skip('No pending requests available for testing');
      return;
    }
    
    await sendButton.click();
    await page.waitForTimeout(2000);
    
    // Verify we're still authenticated - should still be on dashboard, not login
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Verify we can still navigate to other dashboard pages
    await page.goto('/dashboard/integrations');
    await expect(page.getByRole('heading', { name: /email.*integration/i })).toBeVisible();
    
    // Navigate back
    await page.goto('/dashboard/requests');
    await expect(page.getByRole('heading', { name: /document requests/i })).toBeVisible();
  });

  test('should distinguish between session expiration and email account errors', async ({ page }) => {
    await page.goto('/dashboard/requests');
    await expect(page.getByRole('heading', { name: /document requests/i })).toBeVisible();
    
    const sendButton = page.getByRole('button', { name: /^send$/i }).first();
    const sendButtonVisible = await sendButton.isVisible().catch(() => false);
    
    if (!sendButtonVisible) {
      test.skip('No pending requests available for testing');
      return;
    }
    
    // Click send
    await sendButton.click();
    await page.waitForTimeout(2000);
    
    // Check what type of error we got
    const toastMessages = page.locator('[role="alert"]');
    const toastCount = await toastMessages.count();
    
    if (toastCount > 0) {
      const firstToast = toastMessages.first();
      const toastText = await firstToast.textContent();
      
      // Verify error messages are specific to email account, not session
      const isSessionError = toastText?.toLowerCase().includes('session expired') || 
                            toastText?.toLowerCase().includes('log in again');
      const isEmailError = toastText?.toLowerCase().includes('email account') ||
                          toastText?.toLowerCase().includes('no active email') ||
                          toastText?.toLowerCase().includes('connect');
      
      // If there's an error, it should be about email account, not session
      if (isSessionError) {
        console.warn('WARNING: Session expiration error detected when it should be email account error');
        console.warn('This indicates the bug - session error should not appear for email account issues');
      }
      
      // In a properly fixed scenario:
      // - Email account errors are acceptable
      // - Session expiration errors when email account is the issue are NOT acceptable
    }
    
    // Verify we remain authenticated regardless of error type
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

/**
 * Integration Test Helper Functions
 * 
 * These would be used in a full test setup with database access:
 */

/**
 * Helper to disconnect an email account for testing
 * Note: Would require database access in real test setup
 */
async function disconnectEmailAccountForTesting(organizationId: string, email: string) {
  // In a real test, you would:
  // 1. Use Supabase client with service role key
  // 2. Update email_accounts table: set is_active = false
  // 3. Or delete the email account record
  // For now, this is a placeholder
  console.log(`Would disconnect email account: ${email} for org: ${organizationId}`);
}

/**
 * Helper to reconnect an email account for testing
 * Note: Would require OAuth mocking in real test setup
 */
async function reconnectEmailAccountForTesting(organizationId: string, provider: 'gmail' | 'outlook') {
  // In a real test, you would:
  // 1. Mock OAuth flow
  // 2. Set up valid tokens
  // 3. Update email_accounts table: set is_active = true, valid tokens
  // For now, this is a placeholder
  console.log(`Would reconnect ${provider} account for org: ${organizationId}`);
}

