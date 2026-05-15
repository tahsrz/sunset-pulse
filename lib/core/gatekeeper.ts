/**
 * Pulse Gatekeeper - Intelligence-Driven Asset Validation
 * Bridges TAH Bloom Filters with the Property Ingestion Engine.
 * Supports cloud-native TAH retrieval for Vercel environments.
 */

import { TAHGate } from './tah_gate';
import { supabase } from '../supabase';
import fs from 'fs';
import path from 'path';

class Gatekeeper {
  private static instance: Gatekeeper;
  private gate: TAHGate | null = null;
  private isInitializing: boolean = false;

  private constructor() {
    this.loadGate();
  }

  public static getInstance(): Gatekeeper {
    if (!Gatekeeper.instance) {
      Gatekeeper.instance = new Gatekeeper();
    }
    return Gatekeeper.instance;
  }

  /**
   * Internal loader for the TAH Gate
   * Supports local and cloud-native fallback.
   */
  private async loadGate() {
    if (this.isInitializing || this.gate) return;
    this.isInitializing = true;

    const fileName = 'listings_gate.tah';
    const localPath = path.resolve(process.cwd(), `cartridges/${fileName}`);
    let buffer: Buffer | null = null;

    try {
      // 1. Try Local File System
      if (fs.existsSync(localPath)) {
        buffer = fs.readFileSync(localPath);
        console.log(`🛡️ [GATEKEEPER] Loaded ${fileName} from local storage.`);
      } else {
        // 2. Fallback to Supabase Storage
        console.log(`🌐 [GATEKEEPER_FETCH] Downloading ${fileName} from grid storage...`);
        const { data, error } = await supabase.storage
          .from('cartridges')
          .download(fileName);
        
        if (!error && data) {
          const arrayBuffer = await data.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
          console.log(`🛡️ [GATEKEEPER] Loaded ${fileName} from cloud storage.`);
        }
      }

      if (buffer) {
        this.gate = new TAHGate(buffer);
      }
    } catch (err) {
      console.error('[GATEKEEPER_INIT_ERROR] Failed to initialize TAH Gate:', err);
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Validates if a listing has likely changed since the last TAH Forge.
   * Returns true if the listing is NEW or UPDATED.
   * Returns false if the listing is LIKELY UNCHANGED.
   * Defaults to TRUE if the gate is not yet loaded.
   */
  public shouldProcessListing(mlsId: string, lastUpdated: string): boolean {
    if (!this.gate) {
      // If not yet loaded, try to trigger a load (background) and default to processing
      this.loadGate();
      return true;
    }

    const signature = `${mlsId}|${lastUpdated}`;
    
    if (this.gate.isProbablyPresent(signature)) {
      console.log(`🛡️ [GATEKEEPER_HIT] Listing ${mlsId} is LIKELY UNCHANGED. Skipping DB sync.`);
      return false;
    }

    console.log(`📡 [GATEKEEPER_MISS] Listing ${mlsId} is NEW or UPDATED. Proceeding to sync.`);
    return true;
  }
}

export const gatekeeper = Gatekeeper.getInstance();
