import { test, expect } from '@playwright/test';

/**
 * E2E Test for Identity Purifier (Neural Bloom Filter)
 * Verifies the "Zero-Lookup" availability check UI.
 */
test.describe('Identity Purifier Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');
  });

  test('should show emerald green for a new unique username', async ({ page }) => {
    const uniqueUsername = `agent_${Date.now()}`;
    
    const input = page.locator('input[name="username"]');
    await input.fill(uniqueUsername);
    
    // Wait for the probabilistic check to resolve (Instantaneous)
    const feedback = page.locator('.identity-feedback');
    await expect(feedback).toBeVisible();
    await expect(feedback).toHaveClass(/text-emerald-500/);
    await expect(feedback).toContainText(/available/i);
  });

  test('should trigger red warning for a known taken username', async ({ page }) => {
    // We assume 'admin' or similar common names are in the initial filter seed
    const takenUsername = 'admin';
    
    const input = page.locator('input[name="username"]');
    await input.fill(takenUsername);
    
    const feedback = page.locator('.identity-feedback');
    await expect(feedback).toBeVisible();
    await expect(feedback).toHaveClass(/text-red-500/);
    await expect(feedback).toContainText(/taken/i);
  });
});
