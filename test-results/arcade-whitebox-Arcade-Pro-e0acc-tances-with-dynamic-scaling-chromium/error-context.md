# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: arcade-whitebox.spec.ts >> Arcade Protocol: White-Box Analysis >> TacticalCloth: Visual & Physics Integrity >> should render multiple cloth instances with dynamic scaling
- Location: tests\arcade-whitebox.spec.ts:16:9

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('#htc-video-canvas')
Expected: 1
Received: 0
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for locator('#htc-video-canvas')
    8 × locator resolved to 0 elements
      - unexpected value "0"

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
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * Arcade White-Box Test Suite // V3.2
  5   |  * Exhaustive verification of TacticalCloth physics and BubbleTrouble game logic.
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
> 19  |       await expect(clothInstances).toHaveCount(1); // Initially 1 large bubble
      |                                    ^ Error: expect(locator).toHaveCount(expected) failed
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
```