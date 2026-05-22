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

  // 3. Wait for the Grid to manifest (detecting Classic or Modern)
  console.log('📡 [SCOUT] Detecting Matrix interface signature...');
  const mode = await page.evaluate(() => {
    if (document.querySelector('.displayGrid.ajax_display')) return 'CLASSIC';
    if (document.querySelector('#__next') || document.querySelector('.MuiGrid-root')) return 'MODERN';
    return 'UNKNOWN';
  });

  if (mode === 'UNKNOWN') {
    console.log('📡 [SCOUT] Waiting for grid lock-on...');
    await page.waitForFunction(() => 
      document.querySelector('.displayGrid.ajax_display') || 
      document.querySelector('.MuiGrid-root')
    , { timeout: 0 });
  }

  console.log(`✅ [SCOUT] Interface Lock-on: ${mode}. Extracting telemetry...`);

  // 4. Extract Data from the DOM
  const telemetry = await page.evaluate((currentMode) => {
    if (currentMode === 'CLASSIC' || document.querySelector('.displayGrid.ajax_display')) {
      const rows = Array.from(document.querySelectorAll('.DisplayRegRow, .DisplayAltRow'));
      return rows.map(row => {
        const mlsId = row.querySelector('.d109m4')?.textContent?.trim();
        const address = row.querySelector('.d109m5')?.textContent?.trim();
        const city = row.querySelector('.d109m6')?.textContent?.trim();
        const priceRaw = row.querySelector('.d109m12')?.textContent?.trim();
        const m10Cells = Array.from(row.querySelectorAll('.d109m10'));
        const beds = m10Cells[0]?.textContent?.trim();
        const baths = m10Cells[1]?.textContent?.trim();
        const sqft = row.querySelector('.d109m8')?.textContent?.trim();
        const backupMlsId = row.querySelector('a[href*="Redisplay"]')?.textContent?.trim();

        return {
          mls_id: mlsId || backupMlsId,
          address, city, price: priceRaw, beds: parseInt(beds || '0'), baths: parseInt(baths || '0'), sqft: sqft?.replace(/,/g, ''),
          last_updated: new Date().toISOString()
        };
      });
    } else {
      // MODERN MODE (OneHome / Portal View)
      // Properties are typically in cards or grid items
      const cards = Array.from(document.querySelectorAll('.MuiCard-root, [data-id^="property-card"]'));
      return cards.map(card => {
        const price = card.querySelector('.MuiTypography-h6, .MuiTypography-h5')?.textContent?.trim();
        const address = card.querySelector('.MuiTypography-body1, .MuiTypography-subtitle1')?.textContent?.trim();
        const details = card.querySelector('.MuiTypography-body2')?.textContent?.trim(); // e.g. "3 Beds | 2 Baths | 1,500 Sq Ft"
        
        // Match patterns for beds/baths/sqft in the details string
        const bedsMatch = details?.match(/([0-9]+)\s*Bed/i);
        const bathsMatch = details?.match(/([0-9]+)\s*Bath/i);
        const sqftMatch = details?.match(/([0-9,]+)\s*Sq\s*Ft/i);
        
        // Find MLS ID - often in a caption or small text
        const mlsMatch = card.textContent?.match(/ML[S]?\s*#?\s*([0-9]+)/i);

        return {
          mls_id: mlsMatch?.[1],
          address,
          city: 'North Texas', // Modern portal often splits address/city differently
          price,
          beds: parseInt(bedsMatch?.[1] || '0'),
          baths: parseInt(bathsMatch?.[1] || '0'),
          sqft: sqftMatch?.[1]?.replace(/,/g, ''),
          last_updated: new Date().toISOString()
        };
      });
    }
  }, mode);

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
