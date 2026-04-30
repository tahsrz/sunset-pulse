/**
 * MLS / IDX Bridge Service
 * Handles communication with external MLS data providers.
 * Prepared for SimplyRETS, Bridge API, or Spark.
 */

import { fetchProperty } from '@/lib/core/requests';
import { bridgeMlsService } from './bridgeMls';

export interface MLSProperty {
  _id: string;
  source: 'Internal' | 'MLS';
  mls_id?: string;
  listing_status: string;
  //  standardized MLS fields
}

class MLSService {
  private static instance: MLSService;

  private constructor() {}

  public static getInstance(): MLSService {
    if (!MLSService.instance) {
      MLSService.instance = new MLSService();
    }
    return MLSService.instance;
  }

  /**
   * Fetches properties from the unified listing pool.
   * Merges MongoDB results with live Bridge Interactive (NTREIS) stream.
   */
  public async getListings(params: any = {}) {
    const internalUrl = `${process.env.NEXT_PUBLIC_API_DOMAIN || 'http://localhost:3000'}/api/properties`;
    
    // Fetch both in parallel for maximum velocity
    const [internalRes, bridgeListings] = await Promise.all([
      fetch(internalUrl, { cache: 'no-store' })
        .then(r => r.ok ? r.json() : { properties: [] })
        .catch(() => ({ properties: [] })),
      bridgeMlsService.getListings(params)
    ]);

    const internalListings = (internalRes.properties || []).map((p: any) => ({ ...p, source: 'Internal' }));

    // Merge and deduplicate if necessary (though MLS IDs should be unique)
    const combined = [...internalListings, ...bridgeListings];

    // Filter internal listings if city is provided and not already handled by API
    if (params.city) {
      return combined.filter((p: any) => 
        p.location.city.toLowerCase().includes(params.city.toLowerCase())
      );
    }

    return combined;
  }

  /**
   * Resolves a single listing by ID, checking internal first, then Bridge.
   */
  public async getListingById(id: string) {
    //  Try local MongoDB first (standard MongoID length is 24)
    if (id.length === 24) { 
      const internal = await fetchProperty(id);
      if (internal) return internal;
    }

    //  Fallback to Bridge Interactive
    return await bridgeMlsService.getListingById(id);
  }
}

export const mlsService = MLSService.getInstance();
