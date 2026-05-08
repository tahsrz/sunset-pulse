/**
 * Pulse Gatekeeper - Intelligence-Driven Asset Validation
 * Bridges TAH Bloom Filters with the Property Ingestion Engine.
 */

import { TAHGate } from './tah_gate';
import path from 'path';

class Gatekeeper {
  private static instance: Gatekeeper;
  private gate: TAHGate;

  private constructor() {
    const cartridgePath = path.resolve(process.cwd(), 'cartridges/listings_gate.tah');
    this.gate = new TAHGate(cartridgePath);
  }

  public static getInstance(): Gatekeeper {
    if (!Gatekeeper.instance) {
      Gatekeeper.instance = new Gatekeeper();
    }
    return Gatekeeper.instance;
  }

  /**
   * Validates if a listing has likely changed since the last TAH Forge.
   * Returns true if the listing is NEW or UPDATED.
   * Returns false if the listing is LIKELY UNCHANGED.
   */
  public shouldProcessListing(mlsId: string, lastUpdated: string): boolean {
    const signature = `${mlsId}|${lastUpdated}`;
    
    if (this.gate.isProbablyPresent(signature)) {
      console.log(`🛡️ [GATEKEEPER] Listing ${mlsId} is LIKELY UNCHANGED. Skipping DB sync.`);
      return false;
    }

    console.log(`📡 [GATEKEEPER] Listing ${mlsId} is NEW or UPDATED. Proceeding to sync.`);
    return true;
  }
}

export const gatekeeper = Gatekeeper.getInstance();
