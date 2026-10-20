import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('homepage defers the Atlas bundle and stays usable across viewport widths', async ({ page }) => {
  const scriptRequests = new Set<string>();
  page.on('request', (request) => {
    if (request.resourceType() !== 'script') return;
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/_next/static/')) scriptRequests.add(path);
  });

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
  const initialScripts = new Set(scriptRequests);
  await launchButton.click();
  await expect(page.getByRole('button', { name: 'Hide Interface' })).toBeVisible();
  const afterAtlasOpen = [...scriptRequests];
  const deferredScripts = afterAtlasOpen.filter((url) => !initialScripts.has(url));
  expect(deferredScripts.length).toBeGreaterThan(0);

  await writeFile('test-results/homepage-resource-waterfall.json', JSON.stringify({
    initialScriptRequests: [...initialScripts],
    scriptRequestsAfterAtlasOpen: afterAtlasOpen,
    deferredScriptRequests: deferredScripts,
  }, null, 2));

  const closeButton = page.getByRole('button', { name: 'Close Atlas experience' });
  await expect(closeButton).toBeVisible();
  await closeButton.click();
  await expect(launchButton).toBeFocused();

  await launchButton.click();
  await expect(page.getByRole('button', { name: 'Hide Interface' })).toBeVisible();
  await page.getByRole('button', { name: 'Close Atlas experience' }).click();
  await expect(launchButton).toBeFocused();
});
