# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: arcade-whitebox.spec.ts >> Arcade Protocol: White-Box Analysis >> BubbleTrouble: Game Engine White-Box >> should trigger Mission Success and transition to next level
- Location: tests\arcade-whitebox.spec.ts:112:9

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 1

Call Log:
- Test timeout of 30000ms exceeded
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
              - link "Arcade" [ref=e46] [cursor=pointer]:
                - /url: /arcade
          - generic [ref=e47]:
            - link "Login" [ref=e49] [cursor=pointer]:
              - /url: /login
              - generic [ref=e50]: Login
            - link [ref=e51] [cursor=pointer]:
              - /url: /cart
              - img [ref=e52]
      - main [ref=e54]:
        - generic [ref=e56]:
          - generic [ref=e57]:
            - generic [ref=e58]:
              - heading "Arcade_Protocol" [level=1] [ref=e59]
              - paragraph [ref=e60]: STRESS_TESTING_NEURAL_STYLING_LAYER // V3.3
            - generic [ref=e61]:
              - button "Bubble_Trouble" [ref=e62] [cursor=pointer]:
                - img [ref=e63]
                - text: Bubble_Trouble
              - button "Insaniquarium_V3" [ref=e65] [cursor=pointer]:
                - img [ref=e66]
                - text: Insaniquarium_V3
          - generic [ref=e68]:
            - generic [ref=e70]:
              - generic [ref=e77]:
                - generic [ref=e80]: "Sector 01: Suburban_Infiltration"
                - text: "MISSION_STATUS: ACTIVE"
                - text: "TARGET_COUNT: 0"
              - generic [ref=e81]:
                - heading "Mission Success" [level=2] [ref=e82]
                - paragraph [ref=e83]: "Sector 01: Suburban_Infiltration // SECURED"
                - button "Next Sector" [ref=e84] [cursor=pointer]
            - generic [ref=e85]:
              - generic [ref=e86]:
                - 'heading "Operation: Cloth Trouble" [level=3] [ref=e87]':
                  - img [ref=e88]
                  - text: "Operation: Cloth Trouble"
                - paragraph [ref=e90]: This prototype demonstrates the high-performance reactivity of the TacticalCloth component. Each bubble is a live Verlet simulation reacting to physics and combat triggers.
                - generic [ref=e91]:
                  - generic [ref=e92]:
                    - generic [ref=e93]: Combat Reactivity
                    - generic [ref=e94]: When hit, bubbles split and re-rasterize their neural meshes in real-time.
                  - generic [ref=e95]:
                    - generic [ref=e96]: Neural Parity
                    - generic [ref=e97]: Entities inherit current site "vibe" (colors, scanlines) from the VibeContext.
              - generic [ref=e98]:
                - heading "Developer Notes" [level=4] [ref=e99]
                - paragraph [ref=e100]: "\"We repurposed the property visualization mesh for high-frequency collision testing.\""
      - contentinfo [ref=e101]:
        - generic [ref=e102]:
          - img "Logo" [ref=e104]
          - paragraph [ref=e106]: © 2026 SunsetCollective. All rights reserved.
    - generic [ref=e107]:
      - 'button "Oversight: Locked" [ref=e108]':
        - img [ref=e110]
        - img [ref=e112]
        - generic [ref=e114]: "Oversight: Locked"
      - generic [ref=e115]:
        - generic [ref=e116]:
          - generic [ref=e117]:
            - img [ref=e119]
            - generic [ref=e121]:
              - heading "Jamie" [level=3] [ref=e122]
              - paragraph [ref=e127]: Analyst Online
          - generic [ref=e128]:
            - button "Toggle Lefthand Mode" [ref=e129] [cursor=pointer]:
              - img [ref=e130]
            - button [ref=e132] [cursor=pointer]:
              - img [ref=e133]
        - generic [ref=e137]:
          - textbox "Search or ask..." [ref=e138]
          - button [ref=e139] [cursor=pointer]:
            - img [ref=e140]
    - button "Open Dev Portal" [ref=e142] [cursor=pointer]:
      - img [ref=e143]
  - alert [ref=e145]
```

# Test source

```ts
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
  106 |       await expect(gameOverScreen).toBeVisible({ timeout: 15000 });
  107 |       
  108 |       const statusHUD = page.locator('text=MISSION_STATUS:');
  109 |       await expect(statusHUD).toContainText('TERMINATED');
  110 |     });
  111 | 
  112 |     test('should trigger Mission Success and transition to next level', async ({ page }) => {
  113 |       // White-box seek-and-fire loop to clear all bubbles
  114 |       const bubbles = page.getByTestId('bubble');
  115 |       
  116 |       // We clear the first level
  117 |       await expect(async () => {
  118 |         const bubbleBox = await bubbles.first().boundingBox();
  119 |         const player = page.locator('.absolute.bottom-4');
  120 |         const playerBox = await player.boundingBox();
  121 | 
  122 |         if (bubbleBox && playerBox) {
  123 |           const targetX = bubbleBox.x + bubbleBox.width / 2;
  124 |           await page.keyboard.press(playerBox.x + playerBox.width / 2 < targetX ? 'ArrowRight' : 'ArrowLeft');
  125 |           await page.keyboard.press(' ');
  126 |         }
  127 |         
  128 |         const count = await bubbles.count();
  129 |         expect(count).toBe(0);
> 130 |       }).toPass({ timeout: 40000, intervals: [500] });
      |          ^ Error: expect(received).toBe(expected) // Object.is equality
  131 | 
  132 |       // Assert Mission Success screen
  133 |       const successScreen = page.locator('text=Mission Success');
  134 |       await expect(successScreen).toBeVisible();
  135 | 
  136 |       // Click Next Sector
  137 |       const nextBtn = page.locator('button:has-text("Next Sector")');
  138 |       await nextBtn.click();
  139 | 
  140 |       // Verify Level 2 HUD
  141 |       const hud = page.locator('text=Sector 02: Industrial_Logic');
  142 |       await expect(hud).toBeVisible();
  143 |       
  144 |       // Verify new bubble count for Level 2 (2 bubbles)
  145 |       await expect(bubbles).toHaveCount(2);
  146 |     });
  147 |   });
  148 | 
  149 |   test.describe('Insaniquarium: Biological Simulation White-Box', () => {
  150 | 
  151 |     test.beforeEach(async ({ page }) => {
  152 |       // Switch to Insaniquarium
  153 |       const switchBtn = page.locator('button:has-text("Insaniquarium_V3")');
  154 |       await switchBtn.click();
  155 |     });
  156 | 
  157 |     test('should initialize with one unit and allow spawning more', async ({ page }) => {
  158 |       const units = page.getByTestId('unit');
  159 |       await expect(units).toHaveCount(1);
  160 | 
  161 |       const spawnBtn = page.getByTestId('init-unit-btn');
  162 |       await spawnBtn.click();
  163 |       await expect(units).toHaveCount(2);
  164 |     });
  165 | 
  166 |     test('should accumulate resources and allow subsystem deployment', async ({ page }) => {
  167 |       // Wait for a resource to spawn (Silver coin from Tier I unit)
  168 |       // Note: In our current logic, Tier I units don't spawn coins. 
  169 |       // Tier II (size > 1) does. 
  170 |       // Let's spawn a unit and feed it to Tier II.
  171 |       
  172 |       const tank = page.locator('.cursor-crosshair').first();
  173 |       
  174 |       // Spawn some food
  175 |       for (let i = 0; i < 5; i++) {
  176 |         await tank.click({ position: { x: 400, y: 300 } });
  177 |       }
  178 | 
  179 |       // Check for Tier II rank label via hover
  180 |       const unit = page.getByTestId('unit').first();
  181 |       await unit.hover();
  182 |       
  183 |       // Since growth takes time, we'll verify resource spawning logic generally
  184 |       const capacityHud = page.getByTestId('capacity-hud');
  185 |       const initialMoney = await capacityHud.innerText();
  186 |       
  187 |       // Simulate resource collection if one exists
  188 |       const resource = page.getByTestId('resource');
  189 |       if (await resource.isVisible()) {
  190 |         await resource.click();
  191 |         const newMoney = await capacityHud.innerText();
  192 |         expect(parseInt(newMoney.replace('$', ''))).toBeGreaterThan(parseInt(initialMoney.replace('$', '')));
  193 |       }
  194 |     });
  195 | 
  196 |     test('should detect and handle system anomalies', async ({ page }) => {
  197 |       // Anomalies spawn based on THREAT_SPAWN_CHANCE (0.002)
  198 |       // For white-box, we wait for one or verify the HUD reaction
  199 |       const anomaly = page.getByTestId('anomaly');
  200 |       
  201 |       // We can't easily force a spawn without mocking, so we check HUD behavior
  202 |       const tank = page.locator('.cursor-crosshair').first();
  203 |       await expect(tank).toHaveClass(/cursor-crosshair/); // Initial state
  204 |       
  205 |       // If anomaly appears, it should pulse and show ALERT
  206 |       // This is a long-wait test
  207 |     });
  208 |   });
  209 | 
  210 | });
  211 | 
```