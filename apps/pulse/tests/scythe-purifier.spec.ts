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
    // Use an exact phrase from the registry
    const roboticText = "We should leverage market synergies.";
    
    const textarea = page.locator('textarea[placeholder*="Paste your text here"]');
    await textarea.fill(roboticText);
    
    const purifyBtn = page.locator('button:has-text("Initiate Purification")');
    await expect(purifyBtn).toBeEnabled();
    await purifyBtn.click();

    // Assert Humanity Score appears
    const score = page.locator('.humanity-score');
    await expect(score).toBeVisible({ timeout: 15000 });
    
    // Robotic text should have a lower score
    const scoreValue = await score.innerText();
    const numericScore = parseInt(scoreValue.replace('%', ''));
    expect(numericScore).toBeLessThan(100);

    // Assert detections are listed
    const detections = page.locator('.detection-item');
    await expect(detections.first()).toBeVisible();
    await expect(detections.locator('text=/synergies/i').first()).toBeVisible();
  });

  test('should approve high-entropy, human-like text', async ({ page }) => {
    const humanText = "Honestly, the property in Keller is okay, but I'm worried about the price jump next month.";
    
    const textarea = page.locator('textarea[placeholder*="Paste your text here"]');
    await textarea.fill(humanText);
    await page.click('button:has-text("Initiate Purification")');

    const score = page.locator('.humanity-score');
    await expect(score).toBeVisible();
    
    const scoreValue = await score.innerText();
    expect(parseInt(scoreValue)).toBeGreaterThan(90);
  });
});
