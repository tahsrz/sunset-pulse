import { PulseHash } from './PulseHash';

/**
 * PulseHash Collision Audit Tool
 * Stress-tests the PulseHash.city() function against high-volume random inputs.
 * Goal: Verify zero collisions across 100,000 unique property query signatures.
 */
export function runPulseHashAudit(sampleSize = 100000) {
  const hashes = new Map<string, string>();
  let collisions = 0;
  const startTime = Date.now();

  console.log(`[*] Starting PulseHash Collision Audit (Sample: ${sampleSize})...`);

  for (let i = 0; i < sampleSize; i++) {
    // Generate a pseudo-random property query string
    const input = `property_${Math.random().toString(36).substring(2, 15)}_${i}_${Date.now()}`;
    const hash = PulseHash.city(input);

    if (hashes.has(hash)) {
      const existing = hashes.get(hash);
      if (existing !== input) {
        collisions++;
        console.error(`[!] COLLISION DETECTED at index ${i}:`);
        console.error(`    Hash: ${hash}`);
        console.error(`    Input 1: ${existing}`);
        console.error(`    Input 2: ${input}`);
      }
    } else {
      hashes.set(hash, input);
    }

    if (i > 0 && i % 25000 === 0) {
      console.log(`[*] Progress: ${i} signatures fingerprinted...`);
    }
  }

  const duration = Date.now() - startTime;
  console.log(`\n[+] AUDIT COMPLETE`);
  console.log(`    Total Signatures: ${sampleSize}`);
  console.log(`    Collisions: ${collisions}`);
  console.log(`    Avg Latency: ${(duration / sampleSize).toFixed(4)}ms per hash`);
  console.log(`    Total Time: ${duration}ms`);

  return {
    sampleSize,
    collisions,
    duration,
    avgLatency: duration / sampleSize
  };
}
