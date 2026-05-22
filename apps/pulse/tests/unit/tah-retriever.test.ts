import { describe, it, expect } from 'vitest';
import { TAHRetriever } from '@/lib/core/tah_retriever';
import path from 'path';
import fs from 'fs';

describe('TAHRetriever', () => {
  const cartridgePath = path.resolve(__dirname, '../../cartridges/neighborhood_intel.tah');

  it('should load the cartridge correctly', () => {
    if (!fs.existsSync(cartridgePath)) {
      console.warn('Cartridge not found, skipping TAHRetriever load test');
      return;
    }
    const retriever = new TAHRetriever(cartridgePath);
    expect(retriever).toBeDefined();
  });

  it('should identify if a keyword is likely present (Bloom Filter)', () => {
    if (!fs.existsSync(cartridgePath)) return;
    const retriever = new TAHRetriever(cartridgePath);
    
    // Dallas should be in neighborhood_intel.tah
    const containsDallas = retriever.containsKeyword('Dallas');
    expect(containsDallas).toBe(true);

    // Some random string should not be there (high probability)
    const containsRandom = retriever.containsKeyword('xyzzy_non_existent_city');
    expect(containsRandom).toBe(false);
  });

  it('should retrieve shards for a valid query', () => {
    if (!fs.existsSync(cartridgePath)) return;
    const retriever = new TAHRetriever(cartridgePath);
    const results = retriever.search('Dallas');
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].data).toContain('Dallas');
  });

  it('should return empty results for unknown queries', () => {
    if (!fs.existsSync(cartridgePath)) return;
    const retriever = new TAHRetriever(cartridgePath);
    const results = retriever.search('Mars Colony');
    
    expect(results.length).toBe(0);
  });
});
