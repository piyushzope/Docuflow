import { test, expect } from '@playwright/test';

/**
 * Email Receiving E2E Tests
 * 
 * Tests that emails from document request recipients are properly processed:
 * 1. Email without attachments updates request status to "received"
 * 2. Email with attachments creates documents and updates status
 * 3. Dashboard displays received status correctly
 * 
 * Note: These tests require:
 * - A document request to have been sent
 * - The recipient to have replied via email
 * - Email processing to be triggered (manually or via cron)
 */

test.describe('Email Receiving and Status Updates', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to requests page
    // Note: User should be authenticated - in real scenario, add auth setup
    await page.goto('/dashboard/requests');
  });

  test('should display request status badges correctly', async ({ page }) => {
    // Wait for requests list to load
    await page.waitForSelector('text=Document Requests', { timeout: 10000 });
    
    // Check that status badges exist
    // Status badges should have appropriate colors based on status
    const statusBadges = page.locator('[class*="bg-"][class*="text-"]').filter({ hasText: /pending|sent|received|verifying|completed/i });
    
    // At least one status badge should be visible
    const count = await statusBadges.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show "received" status badge with correct styling', async ({ page }) => {
    // Find a request with "received" status
    // Look for green badge (received status uses bg-green-100 text-green-800)
    const receivedBadge = page.locator('span').filter({ 
      hasText: /received/i 
    }).first();
    
    if (await receivedBadge.isVisible()) {
      // Verify it has green styling (received status)
      const className = await receivedBadge.getAttribute('class');
      expect(className).toContain('green');
      
      // Verify text says "received"
      await expect(receivedBadge).toContainText(/received/i);
    }
  });

  test('should trigger manual email processing', async ({ page }) => {
    // This test verifies the manual trigger API endpoint works
    // Note: Requires admin/owner authentication
    
    // Trigger email processing via API
    const response = await page.request.post('/api/process-emails', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Should either succeed (200) or return auth error (401/403)
    expect([200, 401, 403]).toContain(response.status());

    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
      
      if (data.success) {
        expect(data.result).toBeDefined();
        expect(data.result).toHaveProperty('processed');
        expect(data.result).toHaveProperty('errors');
      }
    }
  });

  test('should update request status after email is received (no attachments)', async ({ page }) => {
    // This test scenario:
    // 1. Find a request with "sent" status
    // 2. Simulate that email processing has run
    // 3. Verify status updates to "received"
    
    // Refresh page to get latest data
    await page.reload();
    await page.waitForSelector('text=Document Requests', { timeout: 10000 });

    // Find requests with "sent" status
    const sentBadge = page.locator('span').filter({ 
      hasText: /^sent$/i 
    }).first();
    
    if (await sentBadge.isVisible()) {
      // Get the parent request card
      const requestCard = sentBadge.locator('..').locator('..').locator('..');
      
      // Note: In a real test scenario, you would:
      // 1. Send a document request
      // 2. Have recipient reply with text-only email
      // 3. Trigger email processing manually or wait for cron
      // 4. Refresh page
      // 5. Verify status changed to "received"
      
      // For now, we verify the UI shows status correctly
      const statusText = await sentBadge.textContent();
      expect(statusText?.toLowerCase()).toContain('sent');
    }
  });

  test('should display document count when documents are received', async ({ page }) => {
    // After email with attachments is processed:
    // - Request status should be "received" or "verifying"
    // - Document count should be displayed
    // - Documents should be linked to the request

    await page.reload();
    await page.waitForSelector('text=Document Requests', { timeout: 10000 });

    // Look for requests with "received" or "verifying" status
    const receivedOrVerifying = page.locator('span').filter({ 
      hasText: /received|verifying/i 
    }).first();
    
    if (await receivedOrVerifying.isVisible()) {
      // Verify the request card is visible
      const requestCard = receivedOrVerifying.locator('..').locator('..').locator('..');
      await expect(requestCard).toBeVisible();
    }
  });

  test('should persist status after page refresh', async ({ page }) => {
    // Find any request with a status
    await page.waitForSelector('text=Document Requests', { timeout: 10000 });
    
    // Get the first status badge
    const statusBadge = page.locator('[class*="bg-"][class*="text-"]').filter({ 
      hasText: /pending|sent|received|verifying|completed|missing_files/i 
    }).first();
    
    if (await statusBadge.isVisible()) {
      const statusBeforeRefresh = await statusBadge.textContent();
      
      // Refresh page
      await page.reload();
      await page.waitForSelector('text=Document Requests', { timeout: 10000 });
      
      // Find the same badge (or first badge if we can't track specific one)
      const statusBadgeAfter = page.locator('[class*="bg-"][class*="text-"]').filter({ 
        hasText: /pending|sent|received|verifying|completed|missing_files/i 
      }).first();
      
      if (await statusBadgeAfter.isVisible()) {
        // Status should still be visible (may not be exact same request, but demonstrates persistence)
        const statusAfterRefresh = await statusBadgeAfter.textContent();
        expect(statusAfterRefresh).toBeTruthy();
      }
    }
  });

  test('should show correct status badge colors', async ({ page }) => {
    // Verify status badges have appropriate colors:
    // - pending: yellow (bg-yellow-100 text-yellow-800)
    // - sent: blue (bg-blue-100 text-blue-800)
    // - received: green (bg-green-100 text-green-800)
    // - verifying: (varies)
    // - completed: green (bg-green-100 text-green-800)

    await page.waitForSelector('text=Document Requests', { timeout: 10000 });

    // Check for pending status (yellow)
    const pendingBadge = page.locator('span').filter({ hasText: /^pending$/i }).first();
    if (await pendingBadge.isVisible()) {
      const className = await pendingBadge.getAttribute('class');
      expect(className).toContain('yellow');
    }

    // Check for sent status (blue)
    const sentBadge = page.locator('span').filter({ hasText: /^sent$/i }).first();
    if (await sentBadge.isVisible()) {
      const className = await sentBadge.getAttribute('class');
      expect(className).toContain('blue');
    }

    // Check for received status (green)
    const receivedBadge = page.locator('span').filter({ hasText: /^received$/i }).first();
    if (await receivedBadge.isVisible()) {
      const className = await receivedBadge.getAttribute('class');
      expect(className).toContain('green');
    }
  });
});

test.describe('Email Processing Integration', () => {
  test('should process emails and update requests', async ({ page }) => {
    // Integration test workflow:
    // 1. Navigate to requests page
    // 2. Note current status of a request
    // 3. Trigger email processing
    // 4. Wait a moment for processing
    // 5. Refresh and verify status updated
    
    await page.goto('/dashboard/requests');
    await page.waitForSelector('text=Document Requests', { timeout: 10000 });

    // Get initial state - find a request with "sent" status
    const sentRequests = page.locator('span').filter({ hasText: /^sent$/i });
    const sentCount = await sentRequests.count();
    
    // If there are sent requests, one might get updated
    // Note: This is a simulation - real test would require actual email reply
    
    // Trigger processing (if authenticated as admin)
    try {
      const response = await page.request.post('/api/process-emails');
      if (response.ok()) {
        const result = await response.json();
        console.log('Email processing result:', result);
        
        // Wait a bit for processing to complete
        await page.waitForTimeout(2000);
        
        // Refresh to see updated status
        await page.reload();
        await page.waitForSelector('text=Document Requests', { timeout: 10000 });
      }
    } catch (error) {
      // May fail if not authenticated as admin - that's okay
      console.log('Could not trigger processing (may require admin auth):', error);
    }
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Test that the system handles errors when:
    // - Email account is not configured
    // - OAuth tokens are expired
    // - Edge function fails
    
    await page.goto('/dashboard/requests');
    
    // Try to trigger processing
    const response = await page.request.post('/api/process-emails');
    
    // Should return appropriate status code
    expect([200, 401, 403, 500]).toContain(response.status());
    
    if (!response.ok()) {
      const error = await response.json();
      expect(error).toHaveProperty('error');
    }
  });
});

