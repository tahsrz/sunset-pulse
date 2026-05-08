import { test, expect } from '@playwright/test';

/**
 * E2E Test for Intelligence Cache (PulseCache)
 * Verifies that redundant property queries are served from the cache.
 */
test.describe('Intelligence Cache Verification', () => {
  
  test('should serve redundant search queries from PulseCache', async ({ page }) => {
    const searchTarget = 'Keller';
    
    // 1. Initial Search (Should be a MISS)
    await page.goto('/properties');
    const [response1] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/properties/search') && res.status() === 200),
      page.fill('input[placeholder*="Search by city"]', searchTarget),
      page.keyboard.press('Enter')
    ]);

    const cacheHeader1 = await response1.headerValue('X-Cache');
    // Note: The very first time might be a MISS
    console.log(`Initial Search Cache Status: ${cacheHeader1}`);

    // 2. Redundant Search (Should be a HIT)
    // We trigger the same search again
    const [response2] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/properties/search') && res.status() === 200),
      page.fill('input[placeholder*="Search by city"]', searchTarget),
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
