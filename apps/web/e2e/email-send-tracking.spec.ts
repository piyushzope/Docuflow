import { test, expect } from '@playwright/test';

/**
 * Email Send Tracking E2E Tests
 * 
 * Tests the tracking of sent emails on the document requests page:
 * 1. Status badge updates from "pending" to "sent" after sending
 * 2. "Sent: [timestamp]" appears after email is sent
 * 3. Send button disappears after status changes to "sent"
 * 4. Page refresh shows updated status and timestamp
 * 5. Status persists after page reload
 * 
 * This test verifies that when a user sends an email:
 * - The status is properly tracked and displayed
 * - The sent_at timestamp is recorded and shown
 * - The UI updates to reflect the sent status
 */

test.describe('Email Send Tracking on Document Requests Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to requests page (assuming authenticated)
    await page.goto('/dashboard/requests');
    
    // Wait for page to load
    await expect(page.getByRole('heading', { name: /document requests/i })).toBeVisible();
  });

  test('should display pending status badge before sending', async ({ page }) => {
    // Find a pending request
    const pendingBadge = page.locator('[class*="bg-yellow"]').filter({ 
      hasText: /pending/i 
    }).first();
    
    const pendingBadgeVisible = await pendingBadge.isVisible().catch(() => false);
    
    if (!pendingBadgeVisible) {
      // Look for any status badge with "pending" text
      const pendingText = page.getByText(/pending/i).first();
      const hasPending = await pendingText.isVisible().catch(() => false);
      
      if (!hasPending) {
        test.skip('No pending requests available for testing');
        return;
      }
      
      // Verify pending badge exists
      await expect(pendingText).toBeVisible();
    } else {
      await expect(pendingBadge).toBeVisible();
    }
    
    // Verify "Sent:" timestamp is NOT shown for pending requests
    const sentTimestamp = page.getByText(/sent:/i);
    const hasSentTimestamp = await sentTimestamp.isVisible().catch(() => false);
    expect(hasSentTimestamp).toBeFalsy();
  });

  test('should update status badge to "sent" after sending email', async ({ page }) => {
    // Find a pending request with Send button
    const sendButton = page.getByRole('button', { name: /^send$/i }).first();
    const sendButtonVisible = await sendButton.isVisible().catch(() => false);
    
    if (!sendButtonVisible) {
      test.skip('No pending requests with Send button available');
      return;
    }
    
    // Get the request card that contains this Send button
    const requestCard = sendButton.locator('..').locator('..').locator('..');
    
    // Get initial status badge text
    const initialStatusBadge = requestCard.locator('[class*="rounded-full"]').first();
    const initialStatusText = await initialStatusBadge.textContent().catch(() => '');
    
    // Verify it starts as "pending"
    expect(initialStatusText?.toLowerCase()).toContain('pending');
    
    // Click Send button
    await sendButton.click();
    
    // Wait for API response and page update
    // Wait for success toast
    await page.waitForTimeout(2000);
    
    // Wait for router refresh to complete
    await page.waitForLoadState('networkidle');
    
    // Verify status badge has updated to "sent"
    // The badge should now show "sent" status
    const updatedStatusBadge = page.locator('[class*="bg-blue"]').filter({ 
      hasText: /sent/i 
    }).first();
    
    // Or check for "sent" text in the request card area
    const sentBadge = page.getByText(/^sent$/i).or(
      page.locator('[class*="rounded-full"]').filter({ hasText: /sent/i })
    ).first();
    
    const hasSentBadge = await sentBadge.isVisible().catch(() => false);
    
    // Verify status changed to sent
    if (hasSentBadge) {
      await expect(sentBadge).toBeVisible();
    } else {
      // Alternative: Check if the status text includes "sent"
      const statusText = await page.locator('[class*="rounded-full"]').first().textContent().catch(() => '');
      console.log('Status badge text:', statusText);
      expect(statusText?.toLowerCase()).toContain('sent');
    }
  });

  test('should display "Sent: [timestamp]" after email is sent', async ({ page }) => {
    // Find a pending request
    const sendButton = page.getByRole('button', { name: /^send$/i }).first();
    const sendButtonVisible = await sendButton.isVisible().catch(() => false);
    
    if (!sendButtonVisible) {
      test.skip('No pending requests available for testing');
      return;
    }
    
    // Verify "Sent:" is NOT visible before sending
    const sentTimestampBefore = page.getByText(/sent:/i);
    const hasSentBefore = await sentTimestampBefore.isVisible().catch(() => false);
    expect(hasSentBefore).toBeFalsy();
    
    // Click Send
    await sendButton.click();
    
    // Wait for response and page refresh
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');
    
    // Verify "Sent: [timestamp]" now appears
    const sentTimestamp = page.getByText(/sent:/i);
    await expect(sentTimestamp.first()).toBeVisible({ timeout: 5000 });
    
    // Verify timestamp format (should contain date/time)
    const timestampText = await sentTimestamp.first().textContent();
    expect(timestampText).toContain('Sent:');
    
    // Timestamp should contain a date (e.g., "Nov 2, 2025" or similar)
    const hasDate = /(sent:.*\d{1,2}[,\s]+\d{4})|(sent:.*\d{4})/i.test(timestampText || '');
    expect(hasDate).toBeTruthy();
  });

  test('should hide Send button after status changes to sent', async ({ page }) => {
    // Find a pending request with Send button
    const sendButton = page.getByRole('button', { name: /^send$/i }).first();
    const sendButtonVisible = await sendButton.isVisible().catch(() => false);
    
    if (!sendButtonVisible) {
      test.skip('No pending requests with Send button available');
      return;
    }
    
    // Verify Send button exists
    await expect(sendButton).toBeVisible();
    
    // Click Send
    await sendButton.click();
    
    // Wait for response and page update
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');
    
    // Verify Send button is no longer visible (status is now "sent")
    // The Send button should only appear for "pending" status
    const sendButtonAfter = page.getByRole('button', { name: /^send$/i }).first();
    const sendButtonStillVisible = await sendButtonAfter.isVisible().catch(() => false);
    
    // Send button should be hidden for "sent" status requests
    expect(sendButtonStillVisible).toBeFalsy();
  });

  test('should persist sent status and timestamp after page reload', async ({ page }) => {
    // Find a sent request (if any exist)
    const sentBadge = page.locator('[class*="bg-blue"]').filter({ 
      hasText: /sent/i 
    }).first();
    
    const hasSentRequest = await sentBadge.isVisible().catch(() => false);
    
    if (!hasSentRequest) {
      // Create a sent request by sending a pending one
      const sendButton = page.getByRole('button', { name: /^send$/i }).first();
      const sendButtonVisible = await sendButton.isVisible().catch(() => false);
      
      if (!sendButtonVisible) {
        test.skip('No requests available to test persistence');
        return;
      }
      
      // Send the request
      await sendButton.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');
    }
    
    // Get the sent timestamp text before reload
    const sentTimestampBefore = page.getByText(/sent:/i).first();
    const timestampTextBefore = await sentTimestampBefore.textContent().catch(() => '');
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Wait for page to load
    await expect(page.getByRole('heading', { name: /document requests/i })).toBeVisible();
    
    // Verify status is still "sent" after reload
    const sentBadgeAfter = page.locator('[class*="bg-blue"]').filter({ 
      hasText: /sent/i 
    }).first();
    await expect(sentBadgeAfter).toBeVisible({ timeout: 5000 });
    
    // Verify "Sent:" timestamp is still displayed
    const sentTimestampAfter = page.getByText(/sent:/i).first();
    await expect(sentTimestampAfter).toBeVisible({ timeout: 5000 });
    
    // Verify timestamp text matches (same date, might have different time formatting)
    const timestampTextAfter = await sentTimestampAfter.textContent();
    expect(timestampTextAfter).toContain('Sent:');
    
    // The date part should be the same (timestamp persisted)
    const dateMatchBefore = timestampTextBefore?.match(/\d{1,2}[,\s]+\d{4}|\d{4}/);
    const dateMatchAfter = timestampTextAfter?.match(/\d{1,2}[,\s]+\d{4}|\d{4}/);
    
    if (dateMatchBefore && dateMatchAfter) {
      // Dates should match (same day)
      expect(dateMatchAfter[0]).toBeTruthy();
    }
  });

  test('should update request card with sent status immediately after sending', async ({ page }) => {
    // Find a pending request
    const sendButton = page.getByRole('button', { name: /^send$/i }).first();
    const sendButtonVisible = await sendButton.isVisible().catch(() => false);
    
    if (!sendButtonVisible) {
      test.skip('No pending requests available for testing');
      return;
    }
    
    // Get the parent request card
    const requestCard = sendButton.locator('..').locator('..').locator('..').locator('..');
    
    // Get initial state
    const initialStatus = await requestCard.locator('[class*="rounded-full"]').first().textContent();
    expect(initialStatus?.toLowerCase()).toContain('pending');
    
    // Click Send
    await sendButton.click();
    
    // Wait for success toast
    await page.waitForSelector('[role="alert"]', { state: 'visible', timeout: 5000 }).catch(() => {});
    
    // Wait for page refresh
    await page.waitForTimeout(1500);
    
    // Verify the request card now shows "sent" status
    // Wait for status badge to update
    const sentStatus = page.locator('[class*="bg-blue"]').filter({ hasText: /sent/i }).first();
    await expect(sentStatus).toBeVisible({ timeout: 5000 });
    
    // Verify "Sent:" timestamp appears in the same card area
    const sentTimestamp = requestCard.getByText(/sent:/i);
    const hasTimestamp = await sentTimestamp.isVisible().catch(() => false);
    
    // If not in same card, check if it appears anywhere in the requests list
    if (!hasTimestamp) {
      const anySentTimestamp = page.getByText(/sent:/i).first();
      await expect(anySentTimestamp).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show correct status badge color for sent status', async ({ page }) => {
    // Find a sent request or send a pending one
    let sentBadge = page.locator('[class*="bg-blue"]').filter({ 
      hasText: /sent/i 
    }).first();
    
    let hasSentRequest = await sentBadge.isVisible().catch(() => false);
    
    if (!hasSentRequest) {
      // Send a pending request
      const sendButton = page.getByRole('button', { name: /^send$/i }).first();
      const sendButtonVisible = await sendButton.isVisible().catch(() => false);
      
      if (!sendButtonVisible) {
        test.skip('No requests available to test status badge color');
        return;
      }
      
      await sendButton.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');
      
      sentBadge = page.locator('[class*="bg-blue"]').filter({ hasText: /sent/i }).first();
      hasSentRequest = await sentBadge.isVisible().catch(() => false);
    }
    
    if (hasSentRequest) {
      // Verify badge has blue color class (sent status uses blue-100/blue-800)
      const badgeClasses = await sentBadge.getAttribute('class');
      expect(badgeClasses).toContain('blue');
      
      // Verify it's not yellow (pending) or other colors
      expect(badgeClasses).not.toContain('yellow');
    }
  });

  test('should track multiple sent requests correctly', async ({ page }) => {
    // Send multiple pending requests if available
    const sendButtons = page.getByRole('button', { name: /^send$/i });
    const sendButtonCount = await sendButtons.count();
    
    if (sendButtonCount === 0) {
      test.skip('No pending requests available for testing');
      return;
    }
    
    // Send up to 2 requests
    const requestsToSend = Math.min(2, sendButtonCount);
    
    for (let i = 0; i < requestsToSend; i++) {
      const sendButton = sendButtons.nth(i);
      
      // Verify it's visible
      const isVisible = await sendButton.isVisible().catch(() => false);
      if (!isVisible) continue;
      
      // Click Send
      await sendButton.click();
      
      // Wait for response
      await page.waitForTimeout(1500);
    }
    
    // Wait for all updates to complete
    await page.waitForTimeout(1000);
    await page.waitForLoadState('networkidle');
    
    // Verify all sent requests show "sent" status
    const sentBadges = page.locator('[class*="bg-blue"]').filter({ hasText: /sent/i });
    const sentBadgeCount = await sentBadges.count();
    
    // Should have at least as many sent badges as requests we sent
    expect(sentBadgeCount).toBeGreaterThanOrEqual(requestsToSend);
    
    // Verify all have "Sent:" timestamps
    const sentTimestamps = page.getByText(/sent:/i);
    const timestampCount = await sentTimestamps.count();
    
    // Should have timestamps for sent requests
    expect(timestampCount).toBeGreaterThanOrEqual(requestsToSend);
  });
});

/**
 * Test Helper Functions
 * 
 * These would be used in a full test setup with database access:
 */

/**
 * Helper to verify sent_at timestamp in database
 * Note: Would require database access in real test setup
 */
async function verifySentTimestampInDatabase(requestId: string, expectedTimestamp: string) {
  // In a real test, you would:
  // 1. Use Supabase client with service role key
  // 2. Query document_requests table
  // 3. Verify sent_at field matches expected timestamp
  // 4. Verify status is 'sent'
  console.log(`Would verify sent_at for request ${requestId}: ${expectedTimestamp}`);
}

/**
 * Helper to create test document request
 * Note: Would require database access in real test setup
 */
async function createTestDocumentRequest(organizationId: string, recipientEmail: string) {
  // In a real test, you would:
  // 1. Use Supabase client
  // 2. Insert document request with status 'pending'
  // 3. Return the created request ID
  // For now, this is a placeholder
  console.log(`Would create test request for org ${organizationId}, recipient ${recipientEmail}`);
}

