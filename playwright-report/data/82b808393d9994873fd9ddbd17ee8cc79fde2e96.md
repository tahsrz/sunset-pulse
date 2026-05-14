# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: deep-analysis.spec.ts >> Deep Analysis Recon Flow >> should render specialized intelligence widgets for each judge
- Location: tests\deep-analysis.spec.ts:14:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h2:has-text("Intelligence Command")')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('h2:has-text("Intelligence Command")')

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
      - generic "Loading Spinner" [ref=e57]
    - contentinfo [ref=e58]:
      - generic [ref=e59]:
        - img "Logo" [ref=e61]
        - generic [ref=e62]:
          - paragraph [ref=e63]: © SunsetCollective. All rights reserved.
          - link "Texas Real Estate Commission Consumer Protection Notice (CN 1-5)" [ref=e64] [cursor=pointer]:
            - /url: https://www.trec.texas.gov/forms/consumer-protection-notice
          - generic [ref=e65]: "|"
          - link "Information About Brokerage Services (IABS)" [ref=e66] [cursor=pointer]:
            - /url: /iabs
  - button "Open Dev Portal" [ref=e67] [cursor=pointer]:
    - img [ref=e68]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * E2E Test for Deep Analysis Recon (The "Function")
  5  |  * Verifies that the Council of Judges correctly synthesizes and renders property intelligence.
  6  |  */
  7  | test.describe('Deep Analysis Recon Flow', () => {
  8  |   
  9  |   test.beforeEach(async ({ page }) => {
  10 |     // Navigate to the Intelligence Command (War Room)
  11 |     await page.goto('/abidan');
  12 |   });
  13 | 
  14 |   test('should render specialized intelligence widgets for each judge', async ({ page }) => {
  15 |     // Check for Command Header
> 16 |     await expect(page.locator('h2:has-text("Intelligence Command")')).toBeVisible();
     |                                                                       ^ Error: expect(locator).toBeVisible() failed
  17 | 
  18 |     // 1. Verify Makiel (Future Outlook)
  19 |     await page.click('button:has-text("Makiel")');
  20 |     await expect(page.locator('h3:has-text("Makiel")')).toBeVisible();
  21 |     // Check for the fate chart visualization
  22 |     await expect(page.locator('.makiel-fate-chart')).toBeVisible();
  23 | 
  24 |     // 2. Verify Gadrael (Risk Shield)
  25 |     await page.click('button:has-text("Gadrael")');
  26 |     await expect(page.locator('h3:has-text("Gadrael")')).toBeVisible();
  27 |     // Check for the risk shield visualization
  28 |     await expect(page.locator('.gadrael-risk-shield')).toBeVisible();
  29 |   });
  30 | 
  31 |   test('should load and narrate the integrated daily briefing', async ({ page }) => {
  32 |     // Select the Daily Briefing node
  33 |     await page.click('button:has-text("Daily Briefing")');
  34 |     
  35 |     // Check for Briefing Header
  36 |     const briefingHeader = page.locator('h4:has-text("North Texas Intelligence Summary")');
  37 |     await expect(briefingHeader).toBeVisible({ timeout: 20000 }); // High timeout for data harvest simulation
  38 | 
  39 |     // Verify executive summary presence
  40 |     const summary = page.locator('.executive-summary');
  41 |     await expect(summary).not.toBeEmpty();
  42 | 
  43 |     // Test Narration Toggle (Visual feedback only in E2E)
  44 |     const narrateBtn = page.locator('button:has-text("Narrate Brief")');
  45 |     await narrateBtn.click();
  46 |     await expect(narrateBtn).toContainText('STOP NARRATION');
  47 |     await expect(narrateBtn).toHaveClass(/bg-emerald-500/);
  48 |   });
  49 | });
  50 | 
```