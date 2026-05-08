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
        - generic [ref=e54]:
          - generic [ref=e56]:
            - generic [ref=e57]:
              - heading "The Abidan Court" [level=1] [ref=e58]
              - paragraph [ref=e59]: "[ ACCESS LEVEL: JUDGE // PROTOCOL: MANTLE_ASSUMPTION ]"
            - link "Enter War Room" [ref=e60] [cursor=pointer]:
              - /url: /abidan/war-room
          - generic [ref=e61]:
            - generic [ref=e62]:
              - button "Makiel The Hound" [ref=e63] [cursor=pointer]:
                - generic [ref=e64]:
                  - img [ref=e66]
                  - generic [ref=e68]:
                    - heading "Makiel" [level=3] [ref=e69]
                    - paragraph [ref=e70]: The Hound
              - button "Gadrael The Titan" [ref=e72] [cursor=pointer]:
                - generic [ref=e73]:
                  - img [ref=e75]
                  - generic [ref=e77]:
                    - heading "Gadrael" [level=3] [ref=e78]
                    - paragraph [ref=e79]: The Titan
              - button "Durandiel The Ghost" [ref=e80] [cursor=pointer]:
                - generic [ref=e81]:
                  - img [ref=e83]
                  - generic [ref=e85]:
                    - heading "Durandiel" [level=3] [ref=e86]
                    - paragraph [ref=e87]: The Ghost
              - button "Telariel The Spider" [ref=e88] [cursor=pointer]:
                - generic [ref=e89]:
                  - img [ref=e91]
                  - generic [ref=e93]:
                    - heading "Telariel" [level=3] [ref=e94]
                    - paragraph [ref=e95]: The Spider
              - button "Razael The Wolf" [ref=e96] [cursor=pointer]:
                - generic [ref=e97]:
                  - img [ref=e99]
                  - generic [ref=e101]:
                    - heading "Razael" [level=3] [ref=e102]
                    - paragraph [ref=e103]: The Wolf
              - button "Suriel The Phoenix" [ref=e104] [cursor=pointer]:
                - generic [ref=e105]:
                  - img [ref=e107]
                  - generic [ref=e109]:
                    - heading "Suriel" [level=3] [ref=e110]
                    - paragraph [ref=e111]: The Phoenix
              - button "Zakariel The Fox" [ref=e112] [cursor=pointer]:
                - generic [ref=e113]:
                  - img [ref=e115]
                  - generic [ref=e117]:
                    - heading "Zakariel" [level=3] [ref=e118]
                    - paragraph [ref=e119]: The Fox
              - button "Ozriel The Reaper" [ref=e120] [cursor=pointer]:
                - generic [ref=e121]:
                  - img [ref=e123]
                  - generic [ref=e125]:
                    - heading "Ozriel" [level=3] [ref=e126]
                    - paragraph [ref=e127]: The Reaper
              - button "Jamie Pulse The Regional Briefing" [ref=e128] [cursor=pointer]:
                - generic [ref=e129]:
                  - img [ref=e131]
                  - generic [ref=e133]:
                    - heading "Jamie Pulse" [level=3] [ref=e134]
                    - paragraph [ref=e135]: The Regional Briefing
            - generic [ref=e137]:
              - img [ref=e139]
              - generic [ref=e143]:
                - heading "Makiel" [level=2] [ref=e144]
                - paragraph [ref=e145]: The Hound
              - paragraph [ref=e146]: "\"The Judge of Fate.\""
              - generic [ref=e148]:
                - generic:
                  - generic:
                    - generic:
                      - generic: "[ ORBITAL_SCAN_ACTIVE ]"
                      - generic: "Location: ABIDAN_COR..."
                    - button "Interactive View" [ref=e149] [cursor=pointer]
                  - generic: Sunset Render Engine v7.0.0 // Elite Recon
                  - generic: "MODE: ORBITAL_SCAN"
              - generic [ref=e153]:
                - generic [ref=e154]:
                  - generic [ref=e155]: Geometric Signature
                  - text: hound
                - generic [ref=e156]:
                  - generic [ref=e157]: Power Output
                  - text: Judge Class // ∞
          - generic [ref=e159]:
            - heading "The Way remains. The Court observes." [level=2] [ref=e160]
            - paragraph [ref=e161]: "Property of the Sunset Collective // System: Abidan Core"
      - contentinfo [ref=e162]:
        - generic [ref=e163]:
          - img "Logo" [ref=e165]
          - paragraph [ref=e167]: © 2026 SunsetCollective. All rights reserved.
    - generic [ref=e168]:
      - 'button "Oversight: Locked" [ref=e169]':
        - img [ref=e171]
        - img [ref=e173]
        - generic [ref=e175]: "Oversight: Locked"
      - generic [ref=e176]:
        - generic [ref=e177]:
          - generic [ref=e178]:
            - img [ref=e180]
            - generic [ref=e182]:
              - heading "Jamie" [level=3] [ref=e183]
              - paragraph [ref=e188]: Analyst Online
          - generic [ref=e189]:
            - button "Toggle Lefthand Mode" [ref=e190] [cursor=pointer]:
              - img [ref=e191]
            - button [ref=e193] [cursor=pointer]:
              - img [ref=e194]
        - generic [ref=e198]:
          - textbox "Search or ask..." [ref=e199]
          - button [ref=e200] [cursor=pointer]:
            - img [ref=e201]
    - button "Open Dev Portal" [ref=e203] [cursor=pointer]:
      - img [ref=e204]
  - alert [ref=e206]
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