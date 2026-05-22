/**
 * Pulse Sync Worker
 * Handles background ingestion of Matrix MLS listings into the local grid cache.
 * Implements the "Hybrid Ingestion" strategy for high-availability telemetry.
 */

import connectDB from '@/lib/core/database';
import Property from '@/models/Property';
import { mlsService } from '@/lib/data/mls';

export class PulseSyncWorker {
  /**
   * Performs a manual sync of "Hot Moving" listings from Matrix to Local Grid.
   */
  public async syncHotListings(count: number = 10) {
    console.log(`📡 [PULSE_SYNC] Initiating Matrix Ingestion (Count: ${count})...`);
    
    try {
      await connectDB();
      
      // 1. Fetch raw listings from Matrix API
      const listings = await mlsService.getListings({
        pageSize: count,
        status: 'Active'
      });

      if (!listings || listings.length === 0) {
        console.warn('⚠️ [PULSE_SYNC] Matrix grid returned 0 results. Checking API key or Signal.');
        return { success: false, synced: 0 };
      }

      let syncedCount = 0;

      // 2. Upsert into Local Grid Cache (MongoDB)
      for (const item of listings) {
        // Tag as MLS source and ensure it's mapped to the local schema
        const propertyData = {
          ...item,
          owner: 'MLS_SYSTEM_SYNC',
          source: 'MLS',
          is_demo: false,
          is_featured: false, // Staged is for "Gold Truth", this is "Live"
        };

        // Use mls_id as unique constraint for the local grid cache
        await Property.findOneAndUpdate(
          { mls_id: item.mls_id },
          propertyData,
          { upsert: true, new: true }
        );
        syncedCount++;
      }

      console.log(`✅ [PULSE_SYNC] Matrix Grid Synced: ${syncedCount} assets moved to local cache.`);
      return { success: true, synced: syncedCount };
    } catch (error: any) {
      console.error('❌ [PULSE_SYNC_CRITICAL_FAILURE]:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clears old MLS listings from the cache to keep the grid fresh.
   */
  public async purgeStaleCache(daysOld: number = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    
    try {
      await connectDB();
      const result = await Property.deleteMany({
        source: 'MLS',
        updatedAt: { $lt: cutoff }
      });
      console.log(`🧹 [PULSE_SYNC] Purged ${result.deletedCount} stale MLS signals.`);
    } catch (err) {
      console.error('[PULSE_SYNC_PURGE_ERROR]:', err);
    }
  }
}

export const pulseSyncWorker = new PulseSyncWorker();
