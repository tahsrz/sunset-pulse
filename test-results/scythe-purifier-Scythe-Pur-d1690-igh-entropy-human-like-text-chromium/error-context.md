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
        - generic [ref=e58]:
          - generic [ref=e59]:
            - generic [ref=e60]:
              - img [ref=e61]
              - generic [ref=e63]: Intelligence_Auth
            - heading "Sign In" [level=1] [ref=e64]
            - paragraph [ref=e65]: Secure access to Sunset Pulse
          - button "Continue with Google" [ref=e66] [cursor=pointer]:
            - img [ref=e67]
            - text: Continue with Google
          - generic [ref=e71]: Secure Login
          - generic [ref=e73]:
            - generic [ref=e74]:
              - img [ref=e75]
              - textbox "Email Address" [ref=e77]
            - generic [ref=e78]:
              - img [ref=e79]
              - textbox "Password" [ref=e81]
            - button "Sign In" [ref=e82] [cursor=pointer]
          - generic [ref=e83]:
            - paragraph [ref=e84]:
              - text: Authorized Personnel Only.
              - text: Access attempts are logged for security purposes.
            - paragraph [ref=e85]:
              - text: New User?
              - link "Create Account" [ref=e86] [cursor=pointer]:
                - /url: /register
      - contentinfo [ref=e87]:
        - generic [ref=e88]:
          - img "Logo" [ref=e90]
          - generic [ref=e91]:
            - paragraph [ref=e92]: © 2026 SunsetCollective. All rights reserved.
            - link "Texas Real Estate Commission Consumer Protection Notice (CN 1-5)" [ref=e93] [cursor=pointer]:
              - /url: https://www.trec.texas.gov/forms/consumer-protection-notice
            - generic [ref=e94]: "|"
            - link "Information About Brokerage Services (IABS)" [ref=e95] [cursor=pointer]:
              - /url: /iabs
    - generic [ref=e96]:
      - 'button "Oversight: Locked" [ref=e97]':
        - img [ref=e99]
        - img [ref=e101]
        - generic [ref=e103]: "Oversight: Locked"
      - generic [ref=e104]:
        - generic [ref=e105]:
          - generic [ref=e106]:
            - img [ref=e108]
            - generic [ref=e110]:
              - heading "Jamie" [level=3] [ref=e111]
              - paragraph [ref=e116]: Analyst Online
          - generic [ref=e117]:
            - button "Toggle Lefthand Mode" [ref=e118] [cursor=pointer]:
              - img [ref=e119]
            - button [ref=e121] [cursor=pointer]:
              - img [ref=e122]
        - generic [ref=e126]:
          - textbox "Search or ask..." [ref=e127]
          - button [ref=e128] [cursor=pointer]:
            - img [ref=e129]
    - button "Open Dev Portal" [ref=e131] [cursor=pointer]:
      - img [ref=e132]
  - alert [ref=e134]
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