# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: arcade-whitebox.spec.ts >> Arcade Protocol: White-Box Analysis >> BubbleTrouble: Game Engine White-Box >> should trigger Mission Success and transition to next level
- Location: tests\arcade-whitebox.spec.ts:112:9

# Error details

```
Error: locator.boundingBox: Timeout 15000ms exceeded.
Call log:
  - waiting for getByTestId('bubble').first()


Call Log:
- Test timeout of 30000ms exceeded
```

# Page snapshot

```yaml
- generic [active]:
  - alert [ref=e1]
  - dialog "Failed to compile" [ref=e4]:
    - generic [ref=e5]:
      - heading "Failed to compile" [level=4] [ref=e7]
      - generic [ref=e8]:
        - generic [ref=e10]: "./components/Insaniquarium.tsx Error: x Unexpected token `div`. Expected jsx identifier ,-[C:\\Users\\Taz\\SunsetPulse\\components\\Insaniquarium.tsx:323:1] 323 | }, [pellets, threats, pets, money, gameOver, coins, currentVibe, fish, setVibeFromContent, collectResource]); 324 | 325 | return ( 326 | <div : ^^^ 327 | ref={tankRef} 328 | onClick={handleInteraction} 328 | className={`relative w-[800px] h-[600px] bg-cyan-900 border-8 border-slate-800 mx-auto overflow-hidden rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] cursor-crosshair transition-all duration-500 `---- Caused by: Syntax Error"
        - contentinfo [ref=e11]:
          - paragraph [ref=e12]: This error occurred during the build process and can only be dismissed by fixing the error.
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
      |          ^ Error: locator.boundingBox: Timeout 15000ms exceeded.
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