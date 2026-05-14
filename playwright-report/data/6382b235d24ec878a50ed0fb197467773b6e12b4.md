# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: arcade-whitebox.spec.ts >> Arcade Protocol: White-Box Analysis >> BubbleTrouble: Game Engine White-Box >> should trigger Game Over on collision
- Location: tests\arcade-whitebox.spec.ts:99:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Game Over')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('text=Game Over')

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
              - heading "Arcade_Protocol" [level=1] [ref=e61]
              - paragraph [ref=e62]: STRESS_TESTING_NEURAL_STYLING_LAYER // V3.3
            - generic [ref=e63]:
              - button "Bubble_Trouble" [ref=e64] [cursor=pointer]:
                - img [ref=e65]
                - text: Bubble_Trouble
              - button "Insaniquarium_V3" [ref=e67] [cursor=pointer]:
                - img [ref=e68]
                - text: Insaniquarium_V3
          - generic [ref=e70]:
            - generic [ref=e80]:
              - generic [ref=e83]: "Sector 01: Bowie_Ranch_Gate"
              - text: "LISTING: Bowie Highway Ranch"
              - text: "MARKET: Bowie, TX"
              - text: "MISSION_STATUS: ACTIVE"
              - text: "TARGET_COUNT: 1"
              - text: "LEVEL: 1/50"
            - generic [ref=e84]:
              - generic [ref=e85]:
                - 'heading "Operation: Cloth Trouble" [level=3] [ref=e86]':
                  - img [ref=e87]
                  - text: "Operation: Cloth Trouble"
                - paragraph [ref=e89]: This prototype demonstrates the high-performance reactivity of the TacticalCloth component. Each bubble is a live Verlet simulation reacting to physics and combat triggers.
                - generic [ref=e90]:
                  - generic [ref=e91]:
                    - generic [ref=e92]: Combat Reactivity
                    - generic [ref=e93]: When hit, bubbles split and re-rasterize their neural meshes in real-time.
                  - generic [ref=e94]:
                    - generic [ref=e95]: Neural Parity
                    - generic [ref=e96]: Entities inherit current site "vibe" (colors, scanlines) from the VibeContext.
              - generic [ref=e97]:
                - heading "Developer Notes" [level=4] [ref=e98]
                - paragraph [ref=e99]: "\"We repurposed the property visualization mesh for high-frequency collision testing.\""
      - contentinfo [ref=e100]:
        - generic [ref=e101]:
          - img "Logo" [ref=e103]
          - generic [ref=e104]:
            - paragraph [ref=e105]: © 2026 SunsetCollective. All rights reserved.
            - link "Texas Real Estate Commission Consumer Protection Notice (CN 1-5)" [ref=e106] [cursor=pointer]:
              - /url: https://www.trec.texas.gov/forms/consumer-protection-notice
            - generic [ref=e107]: "|"
            - link "Information About Brokerage Services (IABS)" [ref=e108] [cursor=pointer]:
              - /url: /iabs
    - generic [ref=e109]:
      - 'button "Oversight: Locked" [ref=e110]':
        - img [ref=e112]
        - img [ref=e114]
        - generic [ref=e116]: "Oversight: Locked"
      - generic [ref=e117]:
        - generic [ref=e118]:
          - generic [ref=e119]:
            - img [ref=e121]
            - generic [ref=e123]:
              - heading "Jamie" [level=3] [ref=e124]
              - paragraph [ref=e129]: Analyst Online
          - generic [ref=e130]:
            - button "Toggle Lefthand Mode" [ref=e131] [cursor=pointer]:
              - img [ref=e132]
            - button [ref=e134] [cursor=pointer]:
              - img [ref=e135]
        - generic [ref=e139]:
          - textbox "Search or ask..." [ref=e140]
          - button [ref=e141] [cursor=pointer]:
            - img [ref=e142]
    - button "Open Dev Portal" [ref=e144] [cursor=pointer]:
      - img [ref=e145]
  - alert [ref=e147]
```

# Test source

```ts
  6   |  */
  7   | test.describe('Arcade Protocol: White-Box Analysis', () => {
  8   | 
  9   |   test.beforeEach(async ({ page }) => {
  10  |     // Navigate to the Arcade Protocol page
  11  |     await page.goto('/arcade');
  12  |   });
  13  | 
  14  |   test.describe('TacticalCloth: Visual & Physics Integrity', () => {
  15  |     
  16  |     test('should render multiple cloth instances with dynamic scaling', async ({ page }) => {
  17  |       // Large bubble cloth should be visible
  18  |       const clothInstances = page.locator('#htc-video-canvas');
  19  |       await expect(clothInstances).toHaveCount(1); // Initially 1 large bubble
  20  |       
  21  |       const box = await clothInstances.first().boundingBox();
  22  |       expect(box?.width).toBeGreaterThan(0);
  23  |       expect(box?.height).toBeGreaterThan(0);
  24  |     });
  25  | 
  26  |     test('should inherit mood color from VibeContext', async ({ page }) => {
  27  |       // Trigger a vibe change via Chaos Mode (if available in dev)
  28  |       const chaosBtn = page.locator('button:has-text("Chaos: OFF")');
  29  |       if (await chaosBtn.isVisible()) {
  30  |         await chaosBtn.click();
  31  |         const cycleBtn = page.locator('button:has-text("Cycle Vibe")');
  32  |         await cycleBtn.click(); // Switch to vibe-maxxing (Green)
  33  |         
  34  |         // Check canvas scanline color or mood dot
  35  |         const moodDot = page.locator('.mood-dot').first();
  36  |         const color = await moodDot.evaluate((el) => getComputedStyle(el).backgroundColor);
  37  |         // Green color check (rgb(34, 197, 94) is tailwind green-500)
  38  |         expect(color).toMatch(/rgb\(34, 197, 94\)|#22c55e/);
  39  |       }
  40  |     });
  41  |   });
  42  | 
  43  |   test.describe('BubbleTrouble: Game Engine White-Box', () => {
  44  | 
  45  |     test('should move the player within bounds', async ({ page }) => {
  46  |       const player = page.locator('.absolute.bottom-4');
  47  |       const initialBox = await player.boundingBox();
  48  |       const initialX = initialBox?.x || 0;
  49  | 
  50  |       // Move Right
  51  |       await page.keyboard.press('ArrowRight', { delay: 100 });
  52  |       let newBox = await player.boundingBox();
  53  |       expect(newBox?.x).toBeGreaterThan(initialX);
  54  | 
  55  |       // Move Left
  56  |       await page.keyboard.press('ArrowLeft', { delay: 100 });
  57  |       newBox = await player.boundingBox();
  58  |       expect(newBox?.x).toBeLessThan(initialX + 50); // Should return towards start
  59  |     });
  60  | 
  61  |     test('should split bubbles upon harpoon impact', async ({ page }) => {
  62  |       // Identify target bubble
  63  |       const bubbles = page.getByTestId('bubble');
  64  |       const initialCount = await bubbles.count();
  65  |       expect(initialCount).toBe(1);
  66  | 
  67  |       // HUD for tracking count
  68  |       const hud = page.locator('text=TARGET_COUNT:');
  69  | 
  70  |       // White-box seek-and-fire loop
  71  |       // We attempt to hit the bubble by tracking its position and firing
  72  |       await expect(async () => {
  73  |         const bubbleBox = await bubbles.first().boundingBox();
  74  |         const player = page.locator('.absolute.bottom-4');
  75  |         const playerBox = await player.boundingBox();
  76  | 
  77  |         if (bubbleBox && playerBox) {
  78  |           const targetX = bubbleBox.x + bubbleBox.width / 2;
  79  |           const currentX = playerBox.x + playerBox.width / 2;
  80  | 
  81  |           // Move towards bubble
  82  |           if (currentX < targetX - 10) {
  83  |             await page.keyboard.press('ArrowRight');
  84  |           } else if (currentX > targetX + 10) {
  85  |             await page.keyboard.press('ArrowLeft');
  86  |           }
  87  | 
  88  |           // Fire
  89  |           await page.keyboard.press(' ');
  90  |         }
  91  | 
  92  |         const count = await bubbles.count();
  93  |         expect(count).toBeGreaterThan(1);
  94  |       }).toPass({ timeout: 20000, intervals: [500, 1000] });
  95  | 
  96  |       await expect(hud).toContainText('2');
  97  |     });
  98  | 
  99  |     test('should trigger Game Over on collision', async ({ page }) => {
  100 |       // Move player into the center to ensure hit
  101 |       for (let i = 0; i < 20; i++) {
  102 |         await page.keyboard.press('ArrowLeft');
  103 |       }
  104 |       
  105 |       const gameOverScreen = page.locator('text=Game Over');
> 106 |       await expect(gameOverScreen).toBeVisible({ timeout: 15000 });
      |                                    ^ Error: expect(locator).toBeVisible() failed
  107 |       
  108 |       const statusHUD = page.locator('text=MISSION_STATUS:');
  109 |       await expect(statusHUD).toContainText('TERMINATED');
  110 |     });
  111 | 
  112 |     test('should trigger Mission Success and transition to next level', async ({ page }) => {
  113 |       test.slow(); // Increase timeout for the clearing loop
  114 |       
  115 |       const bubbles = page.getByTestId('bubble');
  116 |       
  117 |       await expect(async () => {
  118 |         const bubbleBox = await bubbles.first().boundingBox();
  119 |         const player = page.locator('.absolute.bottom-4');
  120 |         const playerBox = await player.boundingBox();
  121 | 
  122 |         if (bubbleBox && playerBox) {
  123 |           const targetX = bubbleBox.x + bubbleBox.width / 2;
  124 |           const currentX = playerBox.x + playerBox.width / 2;
  125 | 
  126 |           // More aggressive movement and firing
  127 |           if (Math.abs(currentX - targetX) > 15) {
  128 |             await page.keyboard.press(currentX < targetX ? 'ArrowRight' : 'ArrowLeft');
  129 |           }
  130 |           await page.keyboard.press(' ', { delay: 50 });
  131 |         }
  132 |         
  133 |         const count = await bubbles.count();
  134 |         expect(count).toBe(0);
  135 |       }).toPass({ timeout: 60000, intervals: [200] });
  136 | 
  137 |       // Assert Mission Success screen
  138 |       const successScreen = page.locator('text=Mission Success');
  139 |       await expect(successScreen).toBeVisible();
  140 | 
  141 |       // Click Next Sector
  142 |       const nextBtn = page.locator('button:has-text("Next Sector")');
  143 |       await nextBtn.click();
  144 | 
  145 |       // Verify Level 2 HUD
  146 |       const hud = page.locator('text=Sector 02: Industrial_Logic');
  147 |       await expect(hud).toBeVisible();
  148 |       
  149 |       // Verify new bubble count for Level 2 (2 bubbles)
  150 |       await expect(bubbles).toHaveCount(2);
  151 |     });
  152 |   });
  153 | 
  154 |   test.describe('Insaniquarium: Biological Simulation White-Box', () => {
  155 | 
  156 |     test.beforeEach(async ({ page }) => {
  157 |       // Switch to Insaniquarium
  158 |       const switchBtn = page.locator('button:has-text("Insaniquarium_V3")');
  159 |       await switchBtn.click();
  160 |     });
  161 | 
  162 |     test('should initialize with one unit and allow spawning more', async ({ page }) => {
  163 |       const units = page.getByTestId('unit');
  164 |       await expect(units).toHaveCount(1);
  165 | 
  166 |       const spawnBtn = page.getByTestId('init-unit-btn');
  167 |       await spawnBtn.click();
  168 |       await expect(units).toHaveCount(2);
  169 |     });
  170 | 
  171 |     test('should accumulate resources and allow subsystem deployment', async ({ page }) => {
  172 |       // Wait for a resource to spawn (Silver coin from Tier I unit)
  173 |       // Note: In our current logic, Tier I units don't spawn coins. 
  174 |       // Tier II (size > 1) does. 
  175 |       // Let's spawn a unit and feed it to Tier II.
  176 |       
  177 |       const tank = page.locator('.cursor-crosshair').first();
  178 |       
  179 |       // Spawn some food
  180 |       for (let i = 0; i < 5; i++) {
  181 |         await tank.click({ position: { x: 400, y: 300 } });
  182 |       }
  183 | 
  184 |       // Check for Tier II rank label via hover
  185 |       const unit = page.getByTestId('unit').first();
  186 |       await unit.hover();
  187 |       
  188 |       // Since growth takes time, we'll verify resource spawning logic generally
  189 |       const capacityHud = page.getByTestId('capacity-hud');
  190 |       const initialMoney = await capacityHud.innerText();
  191 |       
  192 |       // Simulate resource collection if one exists
  193 |       const resource = page.getByTestId('resource');
  194 |       if (await resource.isVisible()) {
  195 |         await resource.click();
  196 |         const newMoney = await capacityHud.innerText();
  197 |         expect(parseInt(newMoney.replace('$', ''))).toBeGreaterThan(parseInt(initialMoney.replace('$', '')));
  198 |       }
  199 |     });
  200 | 
  201 |     test('should detect and handle system anomalies', async ({ page }) => {
  202 |       // Anomalies spawn based on THREAT_SPAWN_CHANCE (0.002)
  203 |       // For white-box, we wait for one or verify the HUD reaction
  204 |       const anomaly = page.getByTestId('anomaly');
  205 |       
  206 |       // We can't easily force a spawn without mocking, so we check HUD behavior
```