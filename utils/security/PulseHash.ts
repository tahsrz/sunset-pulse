/**
 * PulseHash v1.0
 * High-performance string hashing inspired by CityHash/MurmurHash.
 * Optimized for query memoization and collision resistance.
 */

export class PulseHash {
  /**
   * Generates a 64-bit-like hash (as a hex string) for any input string.
   * Uses multiple shifts and XORs to ensure excellent distribution.
   */
  public static city(input: string): string {
    let h1 = 0x811c9dc5; // FNV offset basis
    let h2 = 0x11023456; // Secondary seed

    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      
      // Mix 1
      h1 ^= char;
      h1 = Math.imul(h1, 0x01000193);
      
      // Mix 2 (The "Probability Tweak")
      h2 = (h2 << 5) - h2 + char;
      h2 |= 0; // Convert to 32-bit int
    }

    // Final Avalanche Mix
    h1 ^= h1 >>> 16;
    h1 = Math.imul(h1, 0x85ebca6b);
    h1 ^= h1 >>> 13;
    h1 = Math.imul(h1, 0xc2b2ae35);
    h1 ^= h1 >>> 16;

    const result = ((h1 >>> 0).toString(16).padStart(8, '0')) + 
                   ((h2 >>> 0).toString(16).padStart(8, '0'));
    
    return result.toUpperCase();
  }

  /**
   * Generates a signature for a complex object by deterministic stringification.
   */
  public static signature(obj: any): string {
    const canonical = JSON.stringify(obj, Object.keys(obj).sort());
    return this.city(canonical);
  }
}
