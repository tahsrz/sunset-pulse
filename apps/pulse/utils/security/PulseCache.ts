/**
 * PulseCache v1.0
 * A high-speed, in-memory Intelligence Cache for Sunset Pulse.
 * Uses PulseHash signatures as keys for O(1) retrieval.
 */

type CacheEntry = {
  data: any;
  expiry: number;
};

export class PulseCache {
  private static DEFAULT_TTL = 300000; // 5 Minutes in MS

  private static getStore(): Map<string, CacheEntry> {
    if (typeof globalThis !== 'undefined') {
      if (!(globalThis as any)._pulseCache) {
        (globalThis as any)._pulseCache = new Map();
      }
      return (globalThis as any)._pulseCache;
    }
    // Fallback for non-global environments
    if (!(this as any)._localStore) {
      (this as any)._localStore = new Map();
    }
    return (this as any)._localStore;
  }

  /**
   * Retrieves data from the cache if it hasn't expired.
   */
  public static get(signature: string): any | null {
    const store = this.getStore();
    const entry = store.get(signature);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      store.delete(signature);
      return null;
    }

    return entry.data;
  }

  /**
   * Stores data in the cache with a specific signature and TTL.
   */
  public static set(signature: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    const store = this.getStore();
    store.set(signature, {
      data,
      expiry: Date.now() + ttl
    });

    // Simple cache eviction if it grows too large (e.g., > 1000 signatures)
    if (store.size > 1000) {
      const firstKey = store.keys().next().value;
      if (firstKey) store.delete(firstKey);
    }
  }

  /**
   * Clears the entire intelligence cache.
   */
  public static purge(): void {
    this.getStore().clear();
  }
}
