/**
 * PersistenceEngine:
 * Saves money, reduces latency, and builds a local intelligence grid.
 */

import { GLOBAL_TTL_SECONDS } from './constants';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class PersistenceEngine {
  private readonly prefix = 'SP_VAULT_';
  private savedCredits = 0;

  constructor() {
    // Load telemetry on initialization
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('SP_TELEMETRY_CREDITS');
      this.savedCredits = saved ? parseInt(saved, 10) : 0;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (typeof window === 'undefined') return null;

    const raw = localStorage.getItem(this.prefix + key);
    if (!raw) return null;

    try {
      const entry: CacheEntry<T> = JSON.parse(raw);
      
      // Check if expired
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }

      this.savedCredits++;
      this.persistTelemetry();
      console.log(`💾 [VAULT_HIT] Key: ${key} // Credits Saved: ${this.savedCredits}`);
      return entry.data;
    } catch (e) {
      return null;
    }
  }

  private static readonly DEFAULT_TTL = GLOBAL_TTL_SECONDS;

  /**
   * Persist data to the Vault with a TTL (Time To Live in seconds).
   */
  async set<T>(key: string, data: T, ttlSeconds: number = PersistenceEngine.DEFAULT_TTL): Promise<void> {
    if (typeof window === 'undefined') return;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (ttlSeconds * 1000)
    };

    localStorage.setItem(this.prefix + key, JSON.stringify(entry));
    console.log(`📡 [VAULT_PERSIST] Key: ${key} // Fresh data captured.`);
  }

  /**
   * Wraps an API call with Vault logic.
   */
  async resolve<T>(key: string, apiCall: () => Promise<T>, ttl: number = PersistenceEngine.DEFAULT_TTL): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    const freshData = await apiCall();
    if (freshData) {
      await this.set(key, freshData, ttl);
    }
    return freshData;
  }

  private persistTelemetry() {
    localStorage.setItem('SP_TELEMETRY_CREDITS', this.savedCredits.toString());
  }

  getTelemetry() {
    return { savedCredits: this.savedCredits };
  }
}

export const persistenceEngine = new PersistenceEngine();
