# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: jamie-hallucinations.spec.ts >> Jamie Hallucination Cycle >> should support manual Chaos Mode overrides
- Location: tests\jamie-hallucinations.spec.ts:33:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button:has-text("Chaos: OFF")')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('button:has-text("Chaos: OFF")')

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
  4  |  * E2E Test for Jamie Hallucination (Meme Mask)
  5  |  * Verifies that AI dialogue triggers UI state transformations.
  6  |  */
  7  | test.describe('Jamie Hallucination Cycle', () => {
  8  |   
  9  |   test.beforeEach(async ({ page }) => {
  10 |     // Navigate to a property page where Jamie is active
  11 |     await page.goto('/properties');
  12 |   });
  13 | 
  14 |   test('should trigger vibe-maxxing UI when Jamie uses optimization keywords', async ({ page }) => {
  15 |     const chatInput = page.locator('textarea[placeholder*="Ask Jamie"]');
  16 |     await chatInput.fill('Let\'s ROI-maxxing this property !!');
  17 |     await page.keyboard.press('Enter');
  18 | 
  19 |     // Wait for the stream to begin and the context to resolve the vibe
  20 |     const root = page.locator('.vibe-simulacrum-root');
  21 |     await expect(root).toHaveClass(/vibe-maxxing/, { timeout: 15000 });
  22 | 
  23 |     // Assert the "Fake Optimization" ticker appears
  24 |     const ticker = page.locator('.animate-marquee');
  25 |     await expect(ticker).toBeVisible();
  26 |     await expect(ticker).toContainText(/OPTIMIZING_YIELD/);
  27 | 
  28 |     // Assert CSS variable injection (Checking primary glow color)
  29 |     const glowColor = await root.evaluate((el) => getComputedStyle(el).getPropertyValue('--primary-glow').trim());
  30 |     expect(glowColor).toBe('#22c55e');
  31 |   });
  32 | 
  33 |   test('should support manual Chaos Mode overrides', async ({ page }) => {
  34 |     // Chaos Mode button is fixed in dev
  35 |     const chaosBtn = page.locator('button:has-text("Chaos: OFF")');
> 36 |     await expect(chaosBtn).toBeVisible();
     |                            ^ Error: expect(locator).toBeVisible() failed
  37 |     
  38 |     await chaosBtn.click();
  39 |     await expect(chaosBtn).toContainText('Chaos: ON');
  40 | 
  41 |     const cycleBtn = page.locator('button:has-text("Cycle Vibe")');
  42 |     await cycleBtn.click(); // Moves from default to first vibe (maxxing)
  43 |     
  44 |     const root = page.locator('.vibe-simulacrum-root');
  45 |     await expect(root).toHaveClass(/vibe-maxxing/);
  46 |   });
  47 | });
  48 | 
```