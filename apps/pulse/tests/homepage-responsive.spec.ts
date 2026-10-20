import { expect, test } from '@playwright/test';

test('homepage fits common viewport widths and returns focus after closing the Atlas', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const widths = [320, 390, 768, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('heading', { name: 'SELL YOUR HOME WITH A CLEAR PLAN.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Request My Free Seller Plan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'EXPLORE NORTH TEXAS YOUR WAY' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/homepage-${width}.png`, fullPage: true });
  }

  const launchButton = page.getByRole('button', { name: 'Open Atlas View' });
  await launchButton.click();
  const closeButton = page.getByRole('button', { name: 'Close Atlas experience' });
  await expect(closeButton).toBeVisible();
  await closeButton.click();
  await expect(launchButton).toBeFocused();
});
