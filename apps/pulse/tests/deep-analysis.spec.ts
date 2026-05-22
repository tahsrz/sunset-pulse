import { test, expect } from '@playwright/test';

/**
 * E2E Test for Deep Analysis Recon (The "Function")
 * Verifies that the Council of Judges correctly synthesizes and renders property intelligence.
 */
test.describe('Deep Analysis Recon Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the Intelligence Command (War Room)
    await page.goto('/abidan');
  });

  test('should render specialized intelligence widgets for each judge', async ({ page }) => {
    // Check for Command Header
    await expect(page.locator('h2:has-text("Intelligence Command")')).toBeVisible();

    // 1. Verify Makiel (Future Outlook)
    await page.click('button:has-text("Makiel")');
    await expect(page.locator('h3:has-text("Makiel")')).toBeVisible();
    // Check for the fate chart visualization
    await expect(page.locator('.makiel-fate-chart')).toBeVisible();

    // 2. Verify Gadrael (Risk Shield)
    await page.click('button:has-text("Gadrael")');
    await expect(page.locator('h3:has-text("Gadrael")')).toBeVisible();
    // Check for the risk shield visualization
    await expect(page.locator('.gadrael-risk-shield')).toBeVisible();
  });

  test('should load and narrate the integrated daily briefing', async ({ page }) => {
    // Select the Daily Briefing node
    await page.click('button:has-text("Daily Briefing")');
    
    // Check for Briefing Header
    const briefingHeader = page.locator('h4:has-text("North Texas Intelligence Summary")');
    await expect(briefingHeader).toBeVisible({ timeout: 20000 }); // High timeout for data harvest simulation

    // Verify executive summary presence
    const summary = page.locator('.executive-summary');
    await expect(summary).not.toBeEmpty();

    // Test Narration Toggle (Visual feedback only in E2E)
    const narrateBtn = page.locator('button:has-text("Narrate Brief")');
    await narrateBtn.click();
    await expect(narrateBtn).toContainText('STOP NARRATION');
    await expect(narrateBtn).toHaveClass(/bg-emerald-500/);
  });
});
