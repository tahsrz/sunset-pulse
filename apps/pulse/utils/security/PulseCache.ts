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
  private static instance: Map<string, CacheEntry> = new Map();
  private static DEFAULT_TTL = 300000; // 5 Minutes in MS

  /**
   * Retrieves data from the cache if it hasn't expired.
   */
  public static get(signature: string): any | null {
    const entry = this.instance.get(signature);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.instance.delete(signature);
      return null;
    }

    return entry.data;
  }

  /**
   * Stores data in the cache with a specific signature and TTL.
   */
  public static set(signature: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.instance.set(signature, {
      data,
      expiry: Date.now() + ttl
    });

    // Simple cache eviction if it grows too large (e.g., > 1000 signatures)
    if (this.instance.size > 1000) {
      const firstKey = this.instance.keys().next().value;
      if (firstKey) this.instance.delete(firstKey);
    }
  }

  /**
   * Clears the entire intelligence cache.
   */
  public static purge(): void {
    this.instance.clear();
  }
}
