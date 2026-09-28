import { expect, test } from '@playwright/test';

test('scan studio exposes only supported capture methods', async ({ page }) => {
  await page.goto('/scan-studio', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Capture the home once. Reuse it everywhere.' })).toBeVisible();
  await expect(page.getByText('LiDAR capture is not enabled yet.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guided video' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Photo walkthrough' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'LiDAR capture' })).toHaveCount(0);
});

test('arbitrary property scan preview deep links stay not found', async ({ page }) => {
  await page.goto('/admin/property-scans/not-a-real-scan/preview', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('link', { name: 'Scan review queue' })).toBeVisible();
  await expect(page.getByText('Property scan session not found.', { exact: true })).toBeVisible();
  await expect(page.getByText('Not a model of', { exact: false })).toHaveCount(0);
});
