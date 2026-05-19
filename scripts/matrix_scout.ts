import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Property from '../models/Property';
import { syncPropertyToIntelligenceGrid } from '../lib/intelligence/propertySync';

dotenv.config({ path: '.env.local' });

/**
 * MATRIX_SCOUT // Tactical Bridge V3.5
 * Uses an active Playwright session to scrape the CoreLogic Matrix Grid.
 * Maps "Gold Truth" real estate data directly into the Sunset Pulse grid.
 */
async function matrixScout() {
  console.log('📡 [MATRIX_SCOUT] Initiating Tactical Bridge...');

  // 1. Launch Browser (Non-headless so the user can log in/navigate)
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 2. Navigate to Matrix
  console.log('🌐 Navigating to Matrix Portal...');
  await page.goto('https://ntrdd.mlsmatrix.com/Matrix/Default.aspx');

  console.log('⚠️  ACTION REQUIRED:');
  console.log('1. Log in to your Matrix account.');
  console.log('2. Navigate to the search results grid you want to ingest.');
  console.log('3. Ensure you are on the "Agent Single Line" or similar grid view.');
  console.log('📡 [SCOUT] Watching for grid signatures...');

  // 3. Wait for the Grid to manifest (using the stable class found in analysis)
  try {
    await page.waitForSelector('.displayGrid.ajax_display', { timeout: 0 });
  } catch (e) {
    console.error('❌ [SCOUT] Grid detection failed or timed out.');
    await browser.close();
    return;
  }

  console.log('✅ [SCOUT] Grid Lock-on Confirmed. Extracting telemetry...');

  // 4. Extract Data from the DOM
  const telemetry = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.DisplayRegRow, .DisplayAltRow'));
    
    return rows.map(row => {
      const tds = Array.from(row.querySelectorAll('td'));
      const mlsId = row.querySelector('.d109m4')?.textContent?.trim();
      const address = row.querySelector('.d109m5')?.textContent?.trim();
      const city = row.querySelector('.d109m6')?.textContent?.trim();
      const priceRaw = row.querySelector('.d109m12')?.textContent?.trim();
      
      // Beds and Baths often share the same d109m10 class in this layout
      const m10Cells = Array.from(row.querySelectorAll('.d109m10'));
      const beds = m10Cells[0]?.textContent?.trim();
      const baths = m10Cells[1]?.textContent?.trim();
      const sqft = row.querySelector('.d109m8')?.textContent?.trim();

      // Fallback: If classes shifted, try to find by link patterns
      const backupMlsId = row.querySelector('a[href*="Redisplay"]')?.textContent?.trim();

      return {
        mls_id: mlsId || backupMlsId,
        address,
        city,
        price: priceRaw,
        beds: parseInt(beds || '0'),
        baths: parseInt(baths || '0'),
        sqft: sqft?.replace(/,/g, ''),
        last_updated: new Date().toISOString()
      };
    });
  });

  console.log(`📊 [SCOUT] Harvested ${telemetry.length} listing signatures.`);

  // 5. Connect to DB and Sync
  if (process.env.MONGODB_URI) {
    console.log('🗄️  Connecting to SunsetCluster for Atomic Truth sync...');
    // We use the existing sync logic to ensure compliance and gatekeeping
    for (const item of telemetry) {
      if (!item.mls_id) continue;

      const propertyData = {
        mls_id: item.mls_id,
        name: item.address,
        type: 'House', // Defaulting to Residential House for scout
        location: {
          street: item.address,
          city: item.city || 'North Texas',
          state: 'TX',
          zipcode: '' // Matrix grid doesn't always show zip
        },
        beds: item.beds,
        baths: item.baths,
        square_feet: parseInt(item.sqft || '0'),
        rates: {
          monthly: parseFloat(item.price?.replace(/[$,]/g, '') || '0')
        },
        source: 'MLS' as const,
        last_updated: item.last_updated
      };

      try {
        // This handles both Mongo and Supabase (if configured)
        await syncPropertyToIntelligenceGrid(propertyData);
      } catch (err: any) {
        console.warn(`⚠️  [SCOUT_SYNC_ERR] Skipping ${item.mls_id}: ${err.message}`);
      }
    }
  }

  console.log('🏁 [SCOUT] Operation Complete. Live signals have been injected.');
  console.log('Press any key to close the bridge...');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', async () => {
    await browser.close();
    process.exit(0);
  });
}

matrixScout().catch(err => {
  console.error('❌ [SCOUT_CRITICAL_FAILURE]:', err);
  process.exit(1);
});
