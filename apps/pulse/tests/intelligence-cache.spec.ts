import { test, expect } from '@playwright/test';

/**
 * E2E Test for Intelligence Cache (PulseCache)
 * Verifies that redundant property queries are served from the cache.
 */
test.describe('Intelligence Cache Verification', () => {
  
  test('should serve redundant search queries from PulseCache', async ({ page }) => {
    const searchTarget = 'Keller';
    
    // Log all network responses to see what is going on
    page.on('response', response => {
      if (response.url().includes('/api/properties/search')) {
        console.log(`DIAGNOSTIC: Url: ${response.url()}, Status: ${response.status()}, Cache: ${response.headers()['x-cache'] || 'none'}`);
      }
    });

    // 1. Initial Search
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    const [response1] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/properties/search'), { timeout: 25000 }),
      page.fill('input[placeholder*="Search by city"]', searchTarget),
      page.keyboard.press('Enter')
    ]);

    const cacheHeader1 = await response1.headerValue('X-Cache');
    console.log(`Initial Search Cache Status: ${cacheHeader1}`);

    await page.waitForLoadState('networkidle');

    // 2. Redundant Search (Should be a HIT)
    // Clear and refill to ensure React state change triggers a new fetch request
    await page.fill('input[placeholder*="Search by city"]', 'Kelle');
    await page.fill('input[placeholder*="Search by city"]', searchTarget);

    const [response2] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/properties/search'), { timeout: 25000 }),
      page.keyboard.press('Enter')
    ]);

    const cacheHeader2 = await response2.headerValue('X-Cache');
    expect(cacheHeader2).toBe('HIT');
  });

  test('should generate unique PulseHash signatures for different queries', async ({ page }) => {
    // Search 1: Keller
    await page.goto('/properties');
    const [res1] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/properties/search')),
      page.fill('input[placeholder*="Search by city"]', 'Keller'),
      page.keyboard.press('Enter')
    ]);
    const json1 = await res1.json();
    const hash1 = json1.metadata.signature;

    // Search 2: Frisco
    const [res2] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/properties/search')),
      page.fill('input[placeholder*="Search by city"]', 'Frisco'),
      page.keyboard.press('Enter')
    ]);
    const json2 = await res2.json();
    const hash2 = json2.metadata.signature;

    expect(hash1).not.toBe(hash2);
  });
});
