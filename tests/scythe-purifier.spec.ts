import { test, expect } from '@playwright/test';

/**
 * E2E Test for Ozriel's Scythe Purifier
 * Verifies linguistic entropy analysis and robotic pattern detection.
 */
test.describe('Scythe Purifier Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the Scythe Purifier tool
    await page.goto('/scythe');
  });

  test('should detect robotic patterns in formulaic text', async ({ page }) => {
    const roboticText = "We aim to unlock the potential and delve into synergies of the market.";
    
    const textarea = page.locator('textarea[placeholder*="Paste text for purification"]');
    await textarea.fill(roboticText);
    await page.click('button:has-text("Purify")');

    // Assert Humanity Score appears
    const score = page.locator('.humanity-score');
    await expect(score).toBeVisible();
    
    // Robotic text should have a lower score
    const scoreValue = await score.innerText();
    expect(parseInt(scoreValue)).toBeLessThan(80);

    // Assert detections are listed
    const detections = page.locator('.detection-item');
    await expect(detections.first()).toBeVisible();
    await expect(page.locator('text=/unlock|delve|synergies/i')).toBeVisible();
  });

  test('should approve high-entropy, human-like text', async ({ page }) => {
    const humanText = "Honestly, the property in Keller is okay, but I'm worried about the price jump next month.";
    
    const textarea = page.locator('textarea[placeholder*="Paste text for purification"]');
    await textarea.fill(humanText);
    await page.click('button:has-text("Purify")');

    const score = page.locator('.humanity-score');
    await expect(score).toBeVisible();
    
    const scoreValue = await score.innerText();
    expect(parseInt(scoreValue)).toBeGreaterThan(90);
  });
});
