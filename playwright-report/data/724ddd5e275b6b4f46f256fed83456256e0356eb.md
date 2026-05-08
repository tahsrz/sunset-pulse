# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scythe-purifier.spec.ts >> Scythe Purifier Flow >> should approve high-entropy, human-like text
- Location: tests\scythe-purifier.spec.ts:35:7

# Error details

```
TimeoutError: locator.fill: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('textarea[placeholder*="Paste text for purification"]')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e7]:
        - generic [ref=e8]:
          - generic [ref=e9]:
            - generic [ref=e10]: "Market Pulse:"
            - generic [ref=e11]: Active
          - generic [ref=e12]:
            - generic [ref=e13]: "Global Yield:"
            - generic [ref=e14]: 6.00%
          - generic [ref=e15]:
            - generic [ref=e16]: "Price Index:"
            - generic [ref=e17]: +1.2%
        - generic [ref=e18]:
          - button "Heatmap" [ref=e19] [cursor=pointer]:
            - img [ref=e20]
            - text: Heatmap
          - button "Yields" [ref=e22] [cursor=pointer]:
            - img [ref=e23]
            - text: Yields
      - navigation [ref=e25]:
        - generic [ref=e27]:
          - generic [ref=e28]:
            - link "Sunset Pulse Sunset Pulse" [ref=e29] [cursor=pointer]:
              - /url: /
              - img "Sunset Pulse" [ref=e30]
              - generic [ref=e31]: Sunset Pulse
            - generic [ref=e33]:
              - link "Home" [ref=e34] [cursor=pointer]:
                - /url: /
              - link "Properties" [ref=e35] [cursor=pointer]:
                - /url: /properties
              - link "Explorer" [ref=e36] [cursor=pointer]:
                - /url: /explorer
              - link "Grill" [ref=e37] [cursor=pointer]:
                - /url: /grill
              - link "Architecture" [ref=e38] [cursor=pointer]:
                - /url: /#architecture
                - img [ref=e39]
                - text: Architecture
              - link "Abidan" [ref=e41] [cursor=pointer]:
                - /url: /abidan
                - img [ref=e42]
                - text: Abidan
              - link "Investors" [ref=e44] [cursor=pointer]:
                - /url: /investors
                - text: Investors
          - generic [ref=e46]:
            - link "Login" [ref=e48] [cursor=pointer]:
              - /url: /login
              - generic [ref=e49]: Login
            - link [ref=e50] [cursor=pointer]:
              - /url: /cart
              - img [ref=e51]
      - main [ref=e53]:
        - generic [ref=e55]:
          - generic [ref=e56]:
            - generic [ref=e57]:
              - img [ref=e58]
              - generic [ref=e60]: Intelligence_Auth
            - heading "Sign In" [level=1] [ref=e61]
            - paragraph [ref=e62]: Secure access to Sunset Pulse
          - button "Continue with Google" [ref=e63] [cursor=pointer]:
            - img [ref=e64]
            - text: Continue with Google
          - generic [ref=e68]: Secure Login
          - generic [ref=e70]:
            - generic [ref=e71]:
              - img [ref=e72]
              - textbox "Email Address" [ref=e74]
            - generic [ref=e75]:
              - img [ref=e76]
              - textbox "Password" [ref=e78]
            - button "Sign In" [ref=e79] [cursor=pointer]
          - generic [ref=e80]:
            - paragraph [ref=e81]:
              - text: Authorized Personnel Only.
              - text: Access attempts are logged for security purposes.
            - paragraph [ref=e82]:
              - text: New User?
              - link "Create Account" [ref=e83] [cursor=pointer]:
                - /url: /register
      - contentinfo [ref=e84]:
        - generic [ref=e85]:
          - img "Logo" [ref=e87]
          - paragraph [ref=e89]: © 2026 SunsetCollective. All rights reserved.
    - generic [ref=e90]:
      - 'button "Oversight: Locked" [ref=e91]':
        - img [ref=e93]
        - img [ref=e95]
        - generic [ref=e97]: "Oversight: Locked"
      - generic [ref=e98]:
        - generic [ref=e99]:
          - generic [ref=e100]:
            - img [ref=e102]
            - generic [ref=e104]:
              - heading "Jamie" [level=3] [ref=e105]
              - paragraph [ref=e110]: Analyst Online
          - generic [ref=e111]:
            - button "Toggle Lefthand Mode" [ref=e112] [cursor=pointer]:
              - img [ref=e113]
            - button [ref=e115] [cursor=pointer]:
              - img [ref=e116]
        - generic [ref=e120]:
          - textbox "Search or ask..." [ref=e121]
          - button [ref=e122] [cursor=pointer]:
            - img [ref=e123]
    - button "Open Dev Portal" [ref=e125] [cursor=pointer]:
      - img [ref=e126]
  - alert [ref=e128]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * E2E Test for Ozriel's Scythe Purifier
  5  |  * Verifies linguistic entropy analysis and robotic pattern detection.
  6  |  */
  7  | test.describe('Scythe Purifier Flow', () => {
  8  |   
  9  |   test.beforeEach(async ({ page }) => {
  10 |     // Navigate to the Scythe Purifier tool
  11 |     await page.goto('/scythe');
  12 |   });
  13 | 
  14 |   test('should detect robotic patterns in formulaic text', async ({ page }) => {
  15 |     const roboticText = "We aim to unlock the potential and delve into synergies of the market.";
  16 |     
  17 |     const textarea = page.locator('textarea[placeholder*="Paste text for purification"]');
  18 |     await textarea.fill(roboticText);
  19 |     await page.click('button:has-text("Purify")');
  20 | 
  21 |     // Assert Humanity Score appears
  22 |     const score = page.locator('.humanity-score');
  23 |     await expect(score).toBeVisible();
  24 |     
  25 |     // Robotic text should have a lower score
  26 |     const scoreValue = await score.innerText();
  27 |     expect(parseInt(scoreValue)).toBeLessThan(80);
  28 | 
  29 |     // Assert detections are listed
  30 |     const detections = page.locator('.detection-item');
  31 |     await expect(detections.first()).toBeVisible();
  32 |     await expect(page.locator('text=/unlock|delve|synergies/i')).toBeVisible();
  33 |   });
  34 | 
  35 |   test('should approve high-entropy, human-like text', async ({ page }) => {
  36 |     const humanText = "Honestly, the property in Keller is okay, but I'm worried about the price jump next month.";
  37 |     
  38 |     const textarea = page.locator('textarea[placeholder*="Paste text for purification"]');
> 39 |     await textarea.fill(humanText);
     |                    ^ TimeoutError: locator.fill: Timeout 15000ms exceeded.
  40 |     await page.click('button:has-text("Purify")');
  41 | 
  42 |     const score = page.locator('.humanity-score');
  43 |     await expect(score).toBeVisible();
  44 |     
  45 |     const scoreValue = await score.innerText();
  46 |     expect(parseInt(scoreValue)).toBeGreaterThan(90);
  47 |   });
  48 | });
  49 | 
```