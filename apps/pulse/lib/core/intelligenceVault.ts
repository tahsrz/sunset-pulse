import connectDB from './database';
import Property from '@/models/Property';

import { GLOBAL_TTL_MS } from './constants';

/**
 * IntelligenceVault:
 * Universal persistence layer for external reconnaissance and intelligence data.
 * Protects APIs from rate limits and provides sub-ms local responses.
 */

export type IntelligenceType = 'neighborhood' | 'rent' | 'valuation';

export class IntelligenceVault {
  // Global Intelligence TTL: 30 Days (Military-grade data retention)
  private static readonly RECON_TTL_MS = GLOBAL_TTL_MS;

  /**
   * Resolves a tactical data point.
   * Checks the Intelligence Grid (DB) first. If stale or missing, executes the mission and commits it.
   */
  public static async resolve<T>(
    propertyId: string,
    intelType: IntelligenceType,
    mission: () => Promise<T>
  ): Promise<T> {
    await connectDB();

    const property = await Property.findById(propertyId);
    if (!property) throw new Error(`Asset ${propertyId} not found in grid.`);

    // Field mapping
    const reconField = `${intelType}_recon`;
    const cachedData = property[reconField];
    const timestamp = property.recon_timestamp;

    const isStale = !timestamp || (Date.now() - new Date(timestamp).getTime()) > this.RECON_TTL_MS;

    if (cachedData && !isStale) {
      console.log(`💾 [GRID_MEMORY_HIT] Intel: ${intelType} // Asset: ${propertyId}`);
      return cachedData as T;
    }

    // Intelligence Miss: Execute active reconnaissance
    console.log(`📡 [ACTIVE_RECON] Intel: ${intelType} // Asset: ${propertyId} // Mission Status: DEPLOYED`);
    const freshData = await mission();

    if (freshData) {
      // Commit to Intelligence Grid
      await Property.findByIdAndUpdate(propertyId, {
        [reconField]: freshData,
        recon_timestamp: new Date()
      });
      console.log(`🔒 [GRID_COMMITTED] Intel: ${intelType} // Asset: ${propertyId}`);
    }

    return freshData;
  }

  /**
   * Checks if a specific intelligence layer is available in the local grid.
   */
  public static async isCaptured(propertyId: string, intelType: IntelligenceType): Promise<boolean> {
    const property = await Property.findById(propertyId).select(`${intelType}_recon recon_timestamp`).lean();
    if (!property) return false;

    const timestamp = property.recon_timestamp;
    const isStale = !timestamp || (Date.now() - new Date(timestamp).getTime()) > this.RECON_TTL_MS;

    return !!(property[`${intelType}_recon`] && !isStale);
  }
}
