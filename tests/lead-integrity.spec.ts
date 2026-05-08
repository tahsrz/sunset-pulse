import { test, expect } from '@playwright/test';

/**
 * E2E Test for Lead Data Integrity
 * Verifies unique constraint and validation logic for real estate leads.
 */
test.describe('Lead Data Integrity Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Assuming there is a lead capture form on the property detail page
    await page.goto('/properties');
    await page.locator('.property-card').first().click();
  });

  test('should prevent duplicate lead submissions with the same email', async ({ page }) => {
    const testEmail = `test_lead_${Date.now()}@example.com`;
    
    // First Submission
    await page.fill('input[name="leadName"]', 'Test Lead');
    await page.fill('input[name="leadEmail"]', testEmail);
    await page.click('button:has-text("Request Info")');
    
    await expect(page.locator('text=/Success|Thank you/i')).toBeVisible();

    // Second Submission (Duplicate Email)
    await page.goto(page.url()); // Reload
    await page.fill('input[name="leadName"]', 'Duplicate Lead');
    await page.fill('input[name="leadEmail"]', testEmail);
    await page.click('button:has-text("Request Info")');

    // Assert error message for duplicate constraint
    await expect(page.locator('text=/already registered|exists|duplicate/i')).toBeVisible();
  });

  test('should validate budget inputs for investment leads', async ({ page }) => {
    await page.fill('input[name="leadName"]', 'Budget Test');
    await page.fill('input[name="leadEmail"]', `budget_${Date.now()}@example.com`);
    
    // Test negative budget
    await page.fill('input[name="budget"]', '-5000');
    await page.click('button:has-text("Request Info")');
    
    await expect(page.locator('text=/must be positive|invalid budget/i')).toBeVisible();
  });
});
