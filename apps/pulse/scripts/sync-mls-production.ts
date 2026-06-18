import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

/**
 * Production MLS sync.
 * Intended to be run via a scheduler. Each run is recorded in the MLS sync ledger.
 */
async function triggerProductionSync() {
  console.log('[PROD_SYNC] Initiating production MLS ingestion...');

  // Dynamic import ensures MLSService and its dependencies are loaded after dotenv.
  const { MLSService } = await import('../lib/data/mls');
  const mlsService = MLSService.getInstance();

  try {
    const params = {
      // Add scoped filters here, for example: city: 'Dallas'
    };

    const run = await mlsService.syncListings(params);
    const { received, synced, skipped, failed } = run.metrics;

    console.log(`[PROD_SYNC] Run ${run.id} complete.`);
    console.log(`[PROD_SYNC] Provider: ${run.provider}`);
    console.log(`[PROD_SYNC] Received: ${received}, synced: ${synced}, skipped: ${skipped}, failed: ${failed}`);
  } catch (error: any) {
    console.error('[PROD_SYNC] Critical failure:', error.message);
    process.exit(1);
  }
}

triggerProductionSync();
