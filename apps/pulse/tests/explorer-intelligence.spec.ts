import { test, expect } from '@playwright/test';
import { explorerEnvelope, explorerListing } from './fixtures/explorerListing';

// Controlled responses and explicit E2E map fixtures exercise UI, not WebGL/tiles.
test.describe('Explorer public search and recovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/jamie/dreams', route => route.fulfill({ json: [] }));
    await page.route('**/api/valuation', route => route.fulfill({ json: { data: [] } }));
    await page.route('**/api/properties**', route => {
      const path = new URL(route.request().url()).pathname;
      const listing = explorerListing();
      const data = path === '/api/properties' ? { properties: [listing, explorerListing({ id: 'no-geo', _id: 'no-geo', name: 'No Map Location', location_geo: undefined })], total: 2 }
        : path === '/api/properties/search' ? [listing] : listing;
      return route.fulfill({ json: explorerEnvelope(data) });
    });
  });

  test('renders public listings and keeps entries without coordinates', async ({ page }) => {
    await page.goto('/explorer', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: '808 W Abram St' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'No Map Location' })).toBeVisible();
    await expect(page.getByText('Map location not listed.')).toBeVisible();
    await expect(page.locator('[data-map-mode="fixture"]')).toBeVisible();
    await expect(page.getByText('Average sale asking price (2 listings)')).toBeVisible();
  });

  test('encodes radius searches, accepts zero coordinates and uses returned samples', async ({ page }) => {
    const request = page.waitForRequest(request => request.url().includes('/api/properties/search?'));
    await page.goto('/explorer?lat=0&lng=0', { waitUntil: 'domcontentloaded' });
    const params = new URL((await request).url()).searchParams;
    expect(params.get('center')).toBe('0,0');
    expect(params.get('radius')).toBe('5');
    await expect(page.getByText('Average sale asking price (1 listing)')).toBeVisible();
    await expect(page.getByText(/These results are a sample/)).toBeVisible();
  });

  test('toggles listing density and nearby places', async ({ page }) => {
    await page.goto('/explorer', { waitUntil: 'domcontentloaded' });
    for (const name of ['Listing Density', 'Nearby Places']) {
      const toggle = page.getByRole('button', { name, exact: true });
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('loads detail deep links through the public endpoint', async ({ page }) => {
    const request = page.waitForRequest(request => new URL(request.url()).pathname === '/api/properties/explorer-fixture');
    await page.goto('/explorer?id=explorer-fixture', { waitUntil: 'domcontentloaded' });
    await request;
    await expect(page.getByRole('link', { name: '808 W Abram St' })).toHaveAttribute('href', '/properties/explorer-fixture');
  });

  test('distinguishes unavailable data from an empty search and recovers on retry', async ({ page }) => {
    let requests = 0;
    await page.route('**/api/properties?*', route => route.fulfill({ json: explorerEnvelope({ properties: [], total: 0 }, ++requests === 1 ? { source: 'unavailable' } : {}) }));
    await page.goto('/explorer', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Property search is temporarily unavailable.')).toBeVisible();
    await page.getByRole('button', { name: 'Retry Search' }).click();
    await expect(page.getByText('No properties were returned for this search.')).toBeVisible();
    expect(requests).toBe(2);
  });

  test('rejects an incomplete deep link without calling listing endpoints', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', request => { if (request.url().includes('/api/properties')) requests.push(request.url()); });
    await page.goto('/explorer?lat=32', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('alert')).toContainText('Include both latitude and longitude.');
    await expect(page.getByRole('link', { name: 'Reset Explorer' })).toBeVisible();
    expect(requests).toEqual([]);
  });
});
