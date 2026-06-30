/**
 * MLS / IDX Bridge Service
 * Handles communication with external MLS data providers.
 * Prepared for Repliers, Bridge API, or future RESO providers.
 */

import { syncPropertyToIntelligenceGrid } from '@/lib/intelligence/propertySync';
import { getListingById, searchListings } from './listingRepository';
import { bridgeMlsService } from './bridgeMls';
import { repliersMlsService } from './repliersMls';
import {
  beginMlsSyncRun,
  finishMlsSyncRun,
  getMlsSyncSnapshot,
  recordMlsSyncListing,
  persistMlsSyncRun,
  type MlsSyncRun,
} from './mlsSyncLedger';
import type { MlsProviderAdapter, MlsProviderName } from './mlsTypes';

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
    await persistMlsSyncRun(run);
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
      if (finished) {
        await persistMlsSyncRun(finished);
        options.onRunFinished?.(finished);
      }
    } catch (error) {
      const failed = finishMlsSyncRun(run.id, { status: 'failed', error });
      if (failed) {
        await persistMlsSyncRun(failed);
        options.onRunFinished?.(failed);
      }
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
   * Compatibility read API. Customer-facing reads resolve from the canonical
   * repository and never call an external MLS provider.
   */
  public async getListings(params: any = {}) {
    return searchListings({
      location: params.city || params.location,
      propertyType: params.type || params.propertyType,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      beds: params.beds,
      baths: params.bathrooms || params.baths,
      status: params.status,
    }, { limit: params.pageSize || params.$limit || 100 });
  }

  /** Provider reads are reserved for explicit ingestion workers. */
  public async getProviderListings(params: any = {}) {
    return this.activeMlsService.getListings(params);
  }

  /**
   * Resolves a single listing from the canonical repository.
   */
  public async getListingById(id: string) {
    return getListingById(id);
  }
}

export const mlsService = MLSService.getInstance();
