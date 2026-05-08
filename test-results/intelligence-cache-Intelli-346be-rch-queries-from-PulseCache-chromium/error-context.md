# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: intelligence-cache.spec.ts >> Intelligence Cache Verification >> should serve redundant search queries from PulseCache
- Location: tests\intelligence-cache.spec.ts:9:7

# Error details

```
TimeoutError: page.fill: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('input[placeholder*="Search by city"]')

```

# Page snapshot

```yaml
- dialog "Unhandled Runtime Error" [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - navigation [ref=e7]:
          - button "previous" [disabled] [ref=e8]:
            - img "previous" [ref=e9]
          - button "next" [disabled] [ref=e11]:
            - img "next" [ref=e12]
          - generic [ref=e14]: 1 of 1 unhandled error
          - generic [ref=e15]:
            - text: Next.js (14.1.0) is outdated
            - link "(learn more)" [ref=e17] [cursor=pointer]:
              - /url: https://nextjs.org/docs/messages/version-staleness
        - button "Close" [ref=e18] [cursor=pointer]:
          - img [ref=e20]
      - heading "Unhandled Runtime Error" [level=1] [ref=e23]
      - paragraph [ref=e24]: "TypeError: Cannot read properties of undefined (reading 'length')"
    - generic [ref=e25]:
      - heading "Source" [level=2] [ref=e26]
      - generic [ref=e27]:
        - link "components\\Properties.jsx (66:20) @ length" [ref=e29] [cursor=pointer]:
          - generic [ref=e30]: components\Properties.jsx (66:20) @ length
          - img [ref=e31]
        - generic [ref=e35]: "64 | </div> 65 | > 66 | {properties.length === 0 ? ( | ^ 67 | <p>No properties found</p> 68 | ) : ( 69 | <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>"
      - button "Show collapsed frames" [ref=e36] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * E2E Test for Intelligence Cache (PulseCache)
  5  |  * Verifies that redundant property queries are served from the cache.
  6  |  */
  7  | test.describe('Intelligence Cache Verification', () => {
  8  |   
  9  |   test('should serve redundant search queries from PulseCache', async ({ page }) => {
  10 |     const searchTarget = 'Keller';
  11 |     
  12 |     // 1. Initial Search (Should be a MISS)
  13 |     await page.goto('/properties');
  14 |     const [response1] = await Promise.all([
  15 |       page.waitForResponse(res => res.url().includes('/api/properties/search') && res.status() === 200),
> 16 |       page.fill('input[placeholder*="Search by city"]', searchTarget),
     |            ^ TimeoutError: page.fill: Timeout 15000ms exceeded.
  17 |       page.keyboard.press('Enter')
  18 |     ]);
  19 | 
  20 |     const cacheHeader1 = await response1.headerValue('X-Cache');
  21 |     // Note: The very first time might be a MISS
  22 |     console.log(`Initial Search Cache Status: ${cacheHeader1}`);
  23 | 
  24 |     // 2. Redundant Search (Should be a HIT)
  25 |     // We trigger the same search again
  26 |     const [response2] = await Promise.all([
  27 |       page.waitForResponse(res => res.url().includes('/api/properties/search') && res.status() === 200),
  28 |       page.fill('input[placeholder*="Search by city"]', searchTarget),
  29 |       page.keyboard.press('Enter')
  30 |     ]);
  31 | 
  32 |     const cacheHeader2 = await response2.headerValue('X-Cache');
  33 |     expect(cacheHeader2).toBe('HIT');
  34 |   });
  35 | 
  36 |   test('should generate unique PulseHash signatures for different queries', async ({ page }) => {
  37 |     // Search 1: Keller
  38 |     await page.goto('/properties');
  39 |     const [res1] = await Promise.all([
  40 |       page.waitForResponse(res => res.url().includes('/api/properties/search')),
  41 |       page.fill('input[placeholder*="Search by city"]', 'Keller'),
  42 |       page.keyboard.press('Enter')
  43 |     ]);
  44 |     const json1 = await res1.json();
  45 |     const hash1 = json1.metadata.signature;
  46 | 
  47 |     // Search 2: Frisco
  48 |     const [res2] = await Promise.all([
  49 |       page.waitForResponse(res => res.url().includes('/api/properties/search')),
  50 |       page.fill('input[placeholder*="Search by city"]', 'Frisco'),
  51 |       page.keyboard.press('Enter')
  52 |     ]);
  53 |     const json2 = await res2.json();
  54 |     const hash2 = json2.metadata.signature;
  55 | 
  56 |     expect(hash1).not.toBe(hash2);
  57 |   });
  58 | });
  59 | 
```