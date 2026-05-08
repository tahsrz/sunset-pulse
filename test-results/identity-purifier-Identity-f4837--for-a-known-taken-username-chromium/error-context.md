# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: identity-purifier.spec.ts >> Identity Purifier Flow >> should trigger red warning for a known taken username
- Location: tests\identity-purifier.spec.ts:27:7

# Error details

```
TimeoutError: locator.fill: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('input[name="username"]')

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
          - generic [ref=e57]:
            - generic [ref=e58]:
              - img [ref=e59]
              - generic [ref=e61]: Registration
            - heading "Create Account" [level=1] [ref=e62]
            - paragraph [ref=e63]: Join our professional network
          - generic [ref=e64]:
            - generic [ref=e65]:
              - img [ref=e66]
              - textbox "Full Name" [ref=e68]
            - generic [ref=e69]:
              - img [ref=e70]
              - textbox "Username" [ref=e72]
            - generic [ref=e73]:
              - img [ref=e74]
              - textbox "Email Address" [ref=e76]
            - generic [ref=e77]:
              - img [ref=e78]
              - textbox "Password" [ref=e80]
            - generic [ref=e81]:
              - img [ref=e82]
              - textbox "Confirm Password" [ref=e84]
            - button "Continue" [disabled] [ref=e85]
          - paragraph [ref=e87]:
            - text: Already have an account?
            - link "Sign In" [ref=e88] [cursor=pointer]:
              - /url: /login
      - contentinfo [ref=e89]:
        - generic [ref=e90]:
          - img "Logo" [ref=e92]
          - paragraph [ref=e94]: © 2026 SunsetCollective. All rights reserved.
    - generic [ref=e95]:
      - 'button "Oversight: Locked" [ref=e96]':
        - img [ref=e98]
        - img [ref=e100]
        - generic [ref=e102]: "Oversight: Locked"
      - generic [ref=e103]:
        - generic [ref=e104]:
          - generic [ref=e105]:
            - img [ref=e107]
            - generic [ref=e109]:
              - heading "Jamie" [level=3] [ref=e110]
              - paragraph [ref=e115]: Analyst Online
          - generic [ref=e116]:
            - button "Toggle Lefthand Mode" [ref=e117] [cursor=pointer]:
              - img [ref=e118]
            - button [ref=e120] [cursor=pointer]:
              - img [ref=e121]
        - generic [ref=e125]:
          - textbox "Search or ask..." [ref=e126]
          - button [ref=e127] [cursor=pointer]:
            - img [ref=e128]
    - button "Open Dev Portal" [ref=e130] [cursor=pointer]:
      - img [ref=e131]
  - alert [ref=e133]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * E2E Test for Identity Purifier (Neural Bloom Filter)
  5  |  * Verifies the "Zero-Lookup" availability check UI.
  6  |  */
  7  | test.describe('Identity Purifier Flow', () => {
  8  |   
  9  |   test.beforeEach(async ({ page }) => {
  10 |     // Navigate to registration page
  11 |     await page.goto('/register');
  12 |   });
  13 | 
  14 |   test('should show emerald green for a new unique username', async ({ page }) => {
  15 |     const uniqueUsername = `agent_${Date.now()}`;
  16 |     
  17 |     const input = page.locator('input[name="username"]');
  18 |     await input.fill(uniqueUsername);
  19 |     
  20 |     // Wait for the probabilistic check to resolve (Instantaneous)
  21 |     const feedback = page.locator('.identity-feedback');
  22 |     await expect(feedback).toBeVisible();
  23 |     await expect(feedback).toHaveClass(/text-emerald-500/);
  24 |     await expect(feedback).toContainText(/available/i);
  25 |   });
  26 | 
  27 |   test('should trigger red warning for a known taken username', async ({ page }) => {
  28 |     // We assume 'admin' or similar common names are in the initial filter seed
  29 |     const takenUsername = 'admin';
  30 |     
  31 |     const input = page.locator('input[name="username"]');
> 32 |     await input.fill(takenUsername);
     |                 ^ TimeoutError: locator.fill: Timeout 15000ms exceeded.
  33 |     
  34 |     const feedback = page.locator('.identity-feedback');
  35 |     await expect(feedback).toBeVisible();
  36 |     await expect(feedback).toHaveClass(/text-red-500/);
  37 |     await expect(feedback).toContainText(/taken/i);
  38 |   });
  39 | });
  40 | 
```