import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

/**
 * PRODUCTION MLS SYNC
 * Triggers the SICP-inspired stream ingestion to populate the Supabase Alpha Grid.
 * This script is intended to be run via a scheduler (CRON).
 */
async function triggerProductionSync() {
  console.log('🚀 [PROD_SYNC] Initiating Production MLS Ingestion...');
  
  // Dynamic import ensures MLSService (and its dependencies) 
  // are loaded only AFTER dotenv has populated process.env
  const { MLSService } = await import('../lib/data/mls');
  const mlsService = MLSService.getInstance();
  
  let count = 0;
  try {
    // We can pass filters here if we want to sync specific regions/types
    const params = {
      // Example: Only North Texas (Dallas/Fort Worth)
      // city: 'Dallas' 
    };

    const stream = mlsService.syncListingStream(params);

    for await (const property of stream) {
      count++;
      if (count % 10 === 0) {
        console.log(`📊 [PROD_SYNC] Processed ${count} listings...`);
      }
    }

    console.log(`✅ [PROD_SYNC] Synchronization complete. Total items: ${count}`);
  } catch (error: any) {
    console.error('❌ [PROD_SYNC] Critical Failure:', error.message);
    process.exit(1);
  }
}

triggerProductionSync();
