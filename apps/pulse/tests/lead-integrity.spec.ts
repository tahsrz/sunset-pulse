import { test, expect } from '@playwright/test';

/**
 * E2E Test for Lead Data Integrity
 * Verifies unique constraint and validation logic for real estate leads.
 */
test.describe('Lead Data Integrity Flow', () => {
  test.setTimeout(60000); // 60s for the whole suite
  
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      console.log(`BROWSER [${msg.type().toUpperCase()}]: ${msg.text()}`);
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
    await page.waitForTimeout(12000); // Wait for Next.js compilation/hydration to completely settle down
    
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

    // Minimize JamieChat if it is open to avoid element pointer interception on the form
    const minimizeBtn = page.locator('button[aria-label="Minimize Chat"]').first();
    if (await minimizeBtn.isVisible()) {
      await minimizeBtn.click({ force: true });
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
    const submitButton = page.locator('form button[type="submit"], button:has-text("Send Inquiry")').first();

    console.log("DIAGNOSTIC: nameInput count:", await nameInput.count());
    console.log("DIAGNOSTIC: emailInput count:", await emailInput.count());
    console.log("DIAGNOSTIC: submitButton count:", await submitButton.count());
    if (await submitButton.count() > 0) {
      console.log("DIAGNOSTIC: submitButton outerHTML:", await submitButton.evaluate(el => el.outerHTML));
    }

    const testEmail = `test_lead_${Date.now()}@example.com`;
    
    // First Submission
    await nameInput.fill('Test Lead');
    await emailInput.fill(testEmail);
    console.log("DIAGNOSTIC: Inputs filled. Clicking submit button...");
    await submitButton.evaluate(el => (el as HTMLButtonElement).click());
    console.log("DIAGNOSTIC: Submit button clicked.");
    
    await expect(page.locator('text=/Success|Inquiry received|Request sent/i').first()).toBeVisible({ timeout: 20000 });

    // Second Submission (Duplicate Email)
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(12000); // Wait for Next.js compilation/hydration to completely settle down
    await handleVerification();
    
    await nameInput.fill('Duplicate Lead');
    await emailInput.fill(testEmail);
    await submitButton.evaluate(el => (el as HTMLButtonElement).click());

    // Assert error message for duplicate constraint
    await expect(page.locator('text=/already registered|exists|duplicate/i')).toBeVisible({ timeout: 20000 });
  });

  test('should validate budget inputs for investment leads', async ({ page }) => {
    const nameInput = page.locator('input[name="name"], input[name="leadName"], input[name="userName"]').first();
    const emailInput = page.locator('input[name="email"], input[name="leadEmail"], input[name="userEmail"]').first();
    const budgetInput = page.locator('input[name="budget"]').first();
    const submitButton = page.locator('form button[type="submit"], button:has-text("Send Inquiry")').first();

    console.log("DIAGNOSTIC TEST 2: nameInput count:", await nameInput.count());
    console.log("DIAGNOSTIC TEST 2: emailInput count:", await emailInput.count());
    console.log("DIAGNOSTIC TEST 2: budgetInput count:", await budgetInput.count());
    console.log("DIAGNOSTIC TEST 2: submitButton count:", await submitButton.count());

    await nameInput.fill('Budget Test');
    await emailInput.fill(`budget_${Date.now()}@example.com`);
    
    // Test negative budget
    await budgetInput.fill('-5000');
    console.log("DIAGNOSTIC TEST 2: Inputs filled. Clicking submit button...");
    await submitButton.evaluate(el => (el as HTMLButtonElement).click());
    console.log("DIAGNOSTIC TEST 2: Submit button clicked.");
    
    await expect(page.locator('text=/must be positive|invalid budget/i')).toBeVisible();
  });
});
