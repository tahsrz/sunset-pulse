/**
 * MLS / IDX Bridge Service
 * Handles communication with external MLS data providers.
 * Prepared for Repliers, Bridge API, or future RESO providers.
 */

import { fetchProperty } from '@/lib/core/requests';
import { syncPropertyToIntelligenceGrid } from '@/lib/intelligence/propertySync';
import { bridgeMlsService } from './bridgeMls';
import { repliersMlsService } from './repliersMls';
import {
  beginMlsSyncRun,
  finishMlsSyncRun,
  getMlsSyncSnapshot,
  recordMlsSyncListing,
  type MlsSyncRun,
} from './mlsSyncLedger';
import type { MlsProviderAdapter, MlsProviderName, NormalizedMlsListing } from './mlsTypes';

export interface MLSProperty {
  _id: string;
  source: 'Internal' | 'MLS';
  mls_id?: string;
  listing_status: string;
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

  private get activeMlsService(): MlsProviderAdapter {
    return (process.env.REPLIERS_API_KEY ? repliersMlsService : bridgeMlsService) as MlsProviderAdapter;
  }

  public getActiveProviderName(): MlsProviderName {
    return this.activeMlsService.provider || 'unknown';
  }

  public getSyncSnapshot() {
    return getMlsSyncSnapshot();
  }

  /**
   * Synchronizes listings from the active stream into the local intelligence pool.
   * Each consumed stream creates a persistent sync run with per-listing metrics.
   */
  public async *syncListingStream(params: any = {}, options: { onRunFinished?: (run: MlsSyncRun) => void } = {}) {
    const run = beginMlsSyncRun({
      provider: this.getActiveProviderName(),
      params,
    });
    const stream = this.activeMlsService.getListingStream(params);

    try {
      for await (const property of stream) {
        try {
          const result = await syncPropertyToIntelligenceGrid(property);
          recordMlsSyncListing(run.id, {
            listing: property,
            outcome: result ? 'synced' : 'skipped',
          });

          console.log(`[PULSE_SYNC] Synchronized: ${property.name} (${property.mls_id})`);
          yield property;
        } catch (error) {
          recordMlsSyncListing(run.id, {
            listing: property,
            outcome: 'failed',
            error,
          });
          console.error(`[PULSE_SYNC_ITEM_ERROR] ${property?.mls_id || 'unknown'}:`, error);
        }
      }

      const finished = finishMlsSyncRun(run.id);
      if (finished) options.onRunFinished?.(finished);
    } catch (error) {
      const failed = finishMlsSyncRun(run.id, { status: 'failed', error });
      if (failed) options.onRunFinished?.(failed);
      throw error;
    }
  }

  /**
   * Consumes the stream and returns the completed run ledger entry.
   */
  public async syncListings(params: any = {}): Promise<MlsSyncRun> {
    let completedRun: MlsSyncRun | null = null;

    for await (const _property of this.syncListingStream(params, { onRunFinished: (run) => { completedRun = run; } })) {
      // The stream performs persistence and ledger recording as it is consumed.
    }

    if (!completedRun) throw new Error('MLS sync did not create a run ledger entry.');
    return completedRun;
  }

  /**
   * Fetches properties from the unified listing pool.
   * Merges MongoDB results with live MLS stream.
   */
  public async getListings(params: any = {}) {
    const domain = process.env.NEXT_PUBLIC_API_DOMAIN || 'http://localhost:3000';
    const protocol = domain.includes('vercel.app') ? 'https' : 'http';
    const internalUrl = domain.startsWith('http') ? `${domain}/api/properties` : `${protocol}://${domain}/api/properties`;

    const [internalRes, mlsListings] = await Promise.all([
      fetch(internalUrl, { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : { properties: [] }))
        .catch(() => ({ properties: [] })),
      this.activeMlsService.getListings(params),
    ]);

    const internalListings = (internalRes.properties || []).map((property: any) => ({
      ...property,
      source: 'Internal' as const,
    }));

    const combined: Array<NormalizedMlsListing | any> = [...internalListings, ...mlsListings];

    if (params.city) {
      return combined.filter((property: any) =>
        property.location?.city?.toLowerCase().includes(params.city.toLowerCase())
      );
    }

    return combined;
  }

  /**
   * Resolves a single listing by ID, checking internal first, then active MLS.
   */
  public async getListingById(id: string) {
    if (id.length === 24) {
      const internal = await fetchProperty(id);
      if (internal) return internal;
    }

    return await this.activeMlsService.getListingById(id);
  }
}

export const mlsService = MLSService.getInstance();
