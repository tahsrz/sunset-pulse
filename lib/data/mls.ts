/**
 * MLS / IDX Bridge Service
 * Handles communication with external MLS data providers.
 * Prepared for SimplyRETS, Bridge API, or Spark.
 */

import { fetchProperty } from '@/lib/core/requests';
import { bridgeMlsService } from './bridgeMls';
import { repliersMlsService } from './repliersMls';
import { syncPropertyToIntelligenceGrid } from '@/lib/intelligence/propertySync';

export interface MLSProperty {
  _id: string;
  source: 'Internal' | 'MLS';
  mls_id?: string;
  listing_status: string;
  //  standardized MLS fields
}

export class MLSService {
  private static instance: MLSService;

  private constructor() {}

  public static getInstance(): MLSService {
    if (!MLSService.instance) {
      MLSService.instance = new MLSService();
    }
    return MLSService.instance;
  }

  private get activeMlsService() {
    return process.env.REPLIERS_API_KEY ? repliersMlsService : bridgeMlsService;
  }

  /**
   * Synchronizes listings from the active stream into the local intelligence pool.
   * This is the "Pulse Sync" - it only touches listings that passed the Gatekeeper.
   */
  public async *syncListingStream(params: any = {}) {
    const stream = this.activeMlsService.getListingStream(params);
    
    for await (const property of stream) {
      // Perform the Atomic Truth Sync (Mongo + Supabase)
      await syncPropertyToIntelligenceGrid(property);
      
      console.log(`✅ [PULSE_SYNC] Synchronized: ${property.name} (${property.mls_id})`);
      yield property;
    }
  }

  /**
   * Fetches properties from the unified listing pool.
   * Merges MongoDB results with live MLS stream.
   */
  public async getListings(params: any = {}) {
    const internalUrl = `${process.env.NEXT_PUBLIC_API_DOMAIN || 'http://localhost:3000'}/api/properties`;
    
    // Fetch both in parallel for maximum velocity
    const [internalRes, mlsListings] = await Promise.all([
      fetch(internalUrl, { cache: 'no-store' })
        .then(r => r.ok ? r.json() : { properties: [] })
        .catch(() => ({ properties: [] })),
      this.activeMlsService.getListings(params)
    ]);

    const internalListings = (internalRes.properties || []).map((p: any) => ({ ...p, source: 'Internal' }));

    // Merge and deduplicate if necessary (though MLS IDs should be unique)
    const combined = [...internalListings, ...mlsListings];

    // Filter internal listings if city is provided and not already handled by API
    if (params.city) {
      return combined.filter((p: any) => 
        p.location.city.toLowerCase().includes(params.city.toLowerCase())
      );
    }

    return combined;
  }

  /**
   * Resolves a single listing by ID, checking internal first, then active MLS.
   */
  public async getListingById(id: string) {
    //  Try local MongoDB first (standard MongoID length is 24)
    if (id.length === 24) { 
      const internal = await fetchProperty(id);
      if (internal) return internal;
    }

    //  Fallback to active MLS service
    return await this.activeMlsService.getListingById(id);
  }
}

export const mlsService = MLSService.getInstance();
