import { test, expect } from '@playwright/test';

/**
 * E2E Test for Lead Data Integrity
 * Verifies unique constraint and validation logic for real estate leads.
 */
test.describe('Lead Data Integrity Flow', () => {
  test.setTimeout(60000); // 60s for the whole suite
  
  test.beforeEach(async ({ page }) => {
    // Log browser messages
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`BROWSER ERROR: ${msg.text()}`);
    });

    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    
    // Select the first property card and navigate to its detail page
    const firstCard = page.locator('.property-card').first();
    await expect(firstCard).toBeVisible({ timeout: 20000 });
    
    const detailsLink = firstCard.getByRole('link', { name: 'Details' });
    await detailsLink.click();
    
    // Wait for the detail page to load
    await page.waitForLoadState('networkidle');
    
    // Check if verification wall is present
    const verificationInput = page.locator('input[placeholder*="Type your answer"]');
    if (await verificationInput.isVisible()) {
      await verificationInput.fill('human');
      await page.click('button:has-text("Confirm")');
      await page.waitForLoadState('networkidle');
    }
    
    // Attempt to find ANY form heading to confirm we are on a detail page
    try {
      const formHeading = page.locator('h3:has-text("Information"), h3:has-text("property"), h3:has-text("Deployment"), h3:has-text("Inquiry")').first();
      await expect(formHeading).toBeVisible({ timeout: 30000 });
    } catch (e) {
      console.log('DEBUG: Detail page content dump:', await page.content());
      throw e;
    }
  });

  test('should prevent duplicate lead submissions with the same email', async ({ page }) => {
    // Re-verify if needed (e.g. after reload)
    const handleVerification = async () => {
      const verificationInput = page.locator('input[placeholder*="Type your answer"]');
      if (await verificationInput.isVisible()) {
        await verificationInput.fill('human');
        await page.click('button:has-text("Confirm")');
        await page.waitForLoadState('networkidle');
      }
    };

    // Ensure we are interacting with the correct form fields
    const nameInput = page.locator('input[name="name"], input[name="leadName"], input[name="userName"]').first();
    const emailInput = page.locator('input[name="email"], input[name="leadEmail"], input[name="userEmail"]').first();
    const submitButton = page.locator('button:has-text("Inquiry"), button:has-text("request"), button:has-text("Initialize"), button:has-text("Send")').first();

    const testEmail = `test_lead_${Date.now()}@example.com`;
    
    // First Submission
    await nameInput.fill('Test Lead');
    await emailInput.fill(testEmail);
    await submitButton.click();
    
    await expect(page.locator('text=/Success|Inquiry received|Request sent/i')).toBeVisible({ timeout: 20000 });

    // Second Submission (Duplicate Email)
    await page.reload();
    await page.waitForLoadState('networkidle');
    await handleVerification();
    
    await nameInput.fill('Duplicate Lead');
    await emailInput.fill(testEmail);
    await submitButton.click();

    // Assert error message for duplicate constraint
    await expect(page.locator('text=/already registered|exists|duplicate/i')).toBeVisible({ timeout: 20000 });
  });

  test('should validate budget inputs for investment leads', async ({ page }) => {
    await page.fill('input[name="name"]', 'Budget Test');
    await page.fill('input[name="email"]', `budget_${Date.now()}@example.com`);
    
    // Test negative budget
    await page.fill('input[name="budget"]', '-5000');
    await page.click('button:has-text("Send Inquiry")');
    
    await expect(page.locator('text=/must be positive|invalid budget/i')).toBeVisible();
  });
});
