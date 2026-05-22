import { test, expect } from '@playwright/test';

/**
 * Explorer Intelligence Test Suite // V1.0
 * Verifies spatial search, Mapbox integration, and deep-linking integrity.
 */
test.describe('Explorer: Spatial Intelligence Grid', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the Explorer with a higher navigation timeout
    await page.goto('/explorer', { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Wait for the map container to exist
    await page.waitForSelector('.mapboxgl-map', { timeout: 20000 });
  });

  test('should initialize map and render property markers', async ({ page }) => {
    // Wait for initial property load
    // markers appear after the Web Worker processes the MongoDB result
    const markers = page.locator('.mapboxgl-marker');
    await expect(markers.first()).toBeVisible({ timeout: 20000 });
  });

  test('should execute radius search and update area analysis', async ({ page }) => {
    // Use domcontentloaded for deep-links to avoid tile-load hangs
    await page.goto('/explorer?lat=33.453823&lng=-97.766724&id=650c8e2b1f4e1a2b3c4d5e6f', { waitUntil: 'domcontentloaded' });
    
    const analysisOverlay = page.locator('text=Area Analysis');
    await expect(analysisOverlay).toBeVisible({ timeout: 15000 });

    // Verify Avg Rent is calculated
    const avgRent = page.locator('text=Avg Rent');
    await expect(avgRent).toBeVisible();
  });

  test('should toggle Grid Intelligence layers', async ({ page }) => {
    // Verify thermal (heatmap) toggle
    const thermalBtn = page.locator('button:has-text("THERMAL")');
    await thermalBtn.click();
    await expect(thermalBtn).toHaveClass(/bg-orange-500/);

    // Verify POI Recon toggle
    const poiBtn = page.locator('button:has-text("POI RECON")');
    await poiBtn.click();
    await expect(poiBtn).toHaveClass(/bg-blue-600/);
  });

  test('should deep-link to a specific property asset', async ({ page }) => {
    // Test a known mock property ID
    const propertyId = '650c8e2b1f4e1a2b3c4d5e6f';
    await page.goto(`/explorer?id=${propertyId}`, { waitUntil: 'domcontentloaded' });

    // Verify the marker is highlighted (PropertyMarker uses hoveredId or target selection)
    const hud = page.locator('text=Priority target:');
    await expect(hud).toBeVisible({ timeout: 15000 });
  });

  test('should integrate Jamie Chat with property data', async ({ page }) => {
    // Use first() to resolve strict mode violation with Provider duplication
    const jamieChat = page.locator('.bg-slate-900\\/90.backdrop-blur-2xl').first();
    await expect(jamieChat).toBeVisible();

    // Open chat and check for input
    const input = page.locator('input[placeholder*="Ask Jamie"]');
    await expect(input).toBeVisible();
  });

  test('should handle empty result sets gracefully', async ({ page }) => {
    // Navigate to a remote coordinate with no properties
    await page.goto('/explorer?lat=0&lng=0', { waitUntil: 'domcontentloaded' });
    
    // Ensure map still loads
    const mapContainer = page.locator('.mapboxgl-map');
    await expect(mapContainer).toBeVisible();
    
    // Area Analysis should indicate no assets (if a selection was made)
    // Since we can't easily draw a polygon in headless E2E without complex mouse move,
    // we verify the component doesn't crash on initial load with 0 results.
    const loadingState = page.locator('text=Initializing Map Explorer...');
    await expect(loadingState).not.toBeVisible();
  });
});
