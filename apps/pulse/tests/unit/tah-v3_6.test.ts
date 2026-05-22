import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { TAHRetrieverV36 } from '../../lib/core/tah_retriever_v3_6';

describe('TAHRetrieverV36 Surgical Integrity', () => {
  const cartridgePath = path.resolve(__dirname, '../../../../../SunsetWars/cartridges/pulse_master_v3_6');
  let retriever: TAHRetrieverV36;

  beforeAll(() => {
    if (!fs.existsSync(`${cartridgePath}.hat`)) {
      console.warn('⚠️ pulse_master_v3_6.hat not found. Skipping live cartridge tests.');
      return;
    }
    retriever = new TAHRetrieverV36(cartridgePath);
  });

  it('should correctly parse v3.6 header and analytics', () => {
    if (!retriever) return;

    // Check header
    // @ts-ignore - accessing private for test
    expect(retriever.shardCount).toBeGreaterThan(0);
    // @ts-ignore
    expect(retriever.sourceRegistry.length).toBe(24);

    // Check a specific shard (e.g., shard 0 - Zero Trust)
    const shard = retriever.getShard(0);
    expect(shard).not.toBeNull();
    if (shard) {
      expect(shard.analytics.complexity).toBeGreaterThan(0);
      expect(shard.analytics.relevance).toBeCloseTo(0.98, 1);
      expect(shard.data).toContain('Zero Trust');
      
      const source = retriever.getSource(shard.analytics.sourceId);
      expect(source?.url).toContain('nist.gov');
    }
  });

  it('should retrieve high-stakes intelligence with surgical precision', () => {
    if (!retriever) return;

    const results = retriever.search('Groq LPU');
    expect(results.length).toBeGreaterThan(0);
    
    const topResult = results[0];
    expect(topResult.data).toContain('Deterministic, ultra-low latency');
    expect(topResult.source.url).toContain('groq.com');
  });

  it('should support location-aware retrieval', () => {
    if (!retriever) return;

    const shard = retriever.getShard(0);
    if (shard) {
      const source = retriever.getSource(shard.analytics.sourceId);
      expect(source?.location).toBe('USA_TX');
    }
  });
});
