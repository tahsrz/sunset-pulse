import { test, expect } from '@playwright/test';

/**
 * E2E Test for Jamie Hallucination (Meme Mask)
 * Verifies that AI dialogue triggers UI state transformations.
 */
test.describe('Jamie Hallucination Cycle', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to a property page where Jamie is active
    await page.goto('/properties');
  });

  test('should trigger vibe-maxxing UI when Jamie uses optimization keywords', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="Ask Jamie"]');
    await chatInput.fill('Let\'s ROI-maxxing this property !!');
    await page.keyboard.press('Enter');

    // Wait for the stream to begin and the context to resolve the vibe
    const root = page.locator('.vibe-simulacrum-root');
    await expect(root).toHaveClass(/vibe-maxxing/, { timeout: 15000 });

    // Assert the "Fake Optimization" ticker appears
    const ticker = page.locator('.animate-marquee');
    await expect(ticker).toBeVisible();
    await expect(ticker).toContainText(/OPTIMIZING_YIELD/);

    // Assert CSS variable injection (Checking primary glow color)
    const glowColor = await root.evaluate((el) => getComputedStyle(el).getPropertyValue('--primary-glow').trim());
    expect(glowColor).toBe('#22c55e');
  });

  test('should support manual Chaos Mode overrides', async ({ page }) => {
    // Chaos Mode button is fixed in dev
    const chaosBtn = page.locator('button:has-text("Chaos: OFF")');
    await expect(chaosBtn).toBeVisible();
    
    await chaosBtn.click();
    await expect(chaosBtn).toContainText('Chaos: ON');

    const cycleBtn = page.locator('button:has-text("Cycle Vibe")');
    await cycleBtn.click(); // Moves from default to first vibe (maxxing)
    
    const root = page.locator('.vibe-simulacrum-root');
    await expect(root).toHaveClass(/vibe-maxxing/);
  });
});
