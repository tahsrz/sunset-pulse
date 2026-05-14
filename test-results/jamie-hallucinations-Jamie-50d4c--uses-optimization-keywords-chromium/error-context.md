# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: jamie-hallucinations.spec.ts >> Jamie Hallucination Cycle >> should trigger vibe-maxxing UI when Jamie uses optimization keywords
- Location: tests\jamie-hallucinations.spec.ts:14:7

# Error details

```
TimeoutError: locator.fill: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('textarea[placeholder*="Ask Jamie"]')
    - waiting for" http://localhost:3000/properties" navigation to finish...
    - navigated to "http://localhost:3000/properties"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - banner [ref=e5]:
      - paragraph [ref=e6]: Notice to Consumers:The contract forms displayed on this site are promulgated by the Texas Real Estate Commission (TREC). These forms are intended for use primarily by licensed real estate brokers or sales agents who are trained in their correct use. Use by the general public without the guidance of a licensed professional is at the user's own risk. These forms are provided for informational/simulation purposes only and do not constitute legal advice.
    - generic [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e11]:
          - generic [ref=e12]: "Market Pulse:"
          - generic [ref=e13]: Active
        - generic [ref=e14]:
          - generic [ref=e15]: "Global Yield:"
          - generic [ref=e16]: 5.42%
        - generic [ref=e17]:
          - generic [ref=e18]: "Price Index:"
          - generic [ref=e19]: +1.2%
      - generic [ref=e20]:
        - button "Heatmap" [ref=e21] [cursor=pointer]:
          - img [ref=e22]
          - text: Heatmap
        - button "Yields" [ref=e24] [cursor=pointer]:
          - img [ref=e25]
          - text: Yields
    - navigation [ref=e27]:
      - generic [ref=e29]:
        - generic [ref=e30]:
          - link "Sunset Pulse Sunset Pulse" [ref=e31] [cursor=pointer]:
            - /url: /
            - img "Sunset Pulse" [ref=e32]
            - generic [ref=e33]: Sunset Pulse
          - generic [ref=e35]:
            - link "Home" [ref=e36] [cursor=pointer]:
              - /url: /
            - link "Properties" [ref=e37] [cursor=pointer]:
              - /url: /properties
            - link "Explorer" [ref=e38] [cursor=pointer]:
              - /url: /explorer
            - link "Grill" [ref=e39] [cursor=pointer]:
              - /url: /grill
            - link "Architecture" [ref=e40] [cursor=pointer]:
              - /url: /#architecture
              - img [ref=e41]
              - text: Architecture
            - link "Abidan" [ref=e43] [cursor=pointer]:
              - /url: /abidan
              - img [ref=e44]
              - text: Abidan
            - link "Investors" [ref=e46] [cursor=pointer]:
              - /url: /investors
              - text: Investors
            - link "Arcade" [ref=e48] [cursor=pointer]:
              - /url: /arcade
        - generic [ref=e49]:
          - link "Login" [ref=e51] [cursor=pointer]:
            - /url: /login
            - generic [ref=e52]: Login
          - link [ref=e53] [cursor=pointer]:
            - /url: /cart
            - img [ref=e54]
    - main [ref=e56]:
      - generic [ref=e60]:
        - generic [ref=e61]:
          - generic [ref=e62]:
            - img [ref=e63]
            - textbox "City, Address, or Zip..." [ref=e65]
          - combobox [ref=e66]:
            - option "All" [selected]
            - option "House"
            - option "Apartment"
            - option "RV Park"
            - option "Condo"
            - option "Industrial"
            - option "Office"
            - option "Senior Living"
            - option "Mobile Home"
          - button "RECON SEARCH" [ref=e67] [cursor=pointer]
        - generic [ref=e68]:
          - button "Advanced Recon Options" [ref=e69] [cursor=pointer]:
            - img [ref=e70]
            - text: Advanced Recon Options
          - button "Save Alert" [ref=e73] [cursor=pointer]:
            - img [ref=e74]
            - text: Save Alert
      - generic "Loading Spinner" [ref=e76]
    - contentinfo [ref=e77]:
      - generic [ref=e78]:
        - img "Logo" [ref=e80]
        - generic [ref=e81]:
          - paragraph [ref=e82]: © SunsetCollective. All rights reserved.
          - link "Texas Real Estate Commission Consumer Protection Notice (CN 1-5)" [ref=e83] [cursor=pointer]:
            - /url: https://www.trec.texas.gov/forms/consumer-protection-notice
          - generic [ref=e84]: "|"
          - link "Information About Brokerage Services (IABS)" [ref=e85] [cursor=pointer]:
            - /url: /iabs
  - button "Open Dev Portal" [ref=e86] [cursor=pointer]:
    - img [ref=e87]
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
> 16 |     await chatInput.fill('Let\'s ROI-maxxing this property !!');
     |                     ^ TimeoutError: locator.fill: Timeout 15000ms exceeded.
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
  28 |     // NEW: Assert TacticalCloth Reactivity
  29 |     const mascotStatus = page.locator('span:has-text("STATUS /")');
  30 |     await expect(mascotStatus).toContainText('MAXXING');
  31 | 
  32 |     // Assert CSS variable injection (Checking primary glow color)
  33 |     const glowColor = await root.evaluate((el) => getComputedStyle(el).getPropertyValue('--primary-glow').trim());
  34 |     expect(glowColor).toBe('#22c55e');
  35 |   });
  36 | 
  37 |   test('should support manual Chaos Mode overrides', async ({ page }) => {
  38 |     // Chaos Mode button is fixed in dev
  39 |     const chaosBtn = page.locator('button:has-text("Chaos: OFF")');
  40 |     await expect(chaosBtn).toBeVisible();
  41 |     
  42 |     await chaosBtn.click();
  43 |     await expect(chaosBtn).toContainText('Chaos: ON');
  44 | 
  45 |     const cycleBtn = page.locator('button:has-text("Cycle Vibe")');
  46 |     await cycleBtn.click(); // Moves from default to first vibe (maxxing)
  47 |     
  48 |     const root = page.locator('.vibe-simulacrum-root');
  49 |     await expect(root).toHaveClass(/vibe-maxxing/);
  50 |   });
  51 | });
  52 | 
```