import { describe, it, expect } from 'vitest';
import { TAHBuilder } from '@/lib/core/tah_builder';
import { TAHRetriever } from '@/lib/core/tah_retriever';

describe('TAHBuilder & Retriever Integration', () => {
  it('should forge a cartridge and retrieve data correctly', () => {
    const builder = new TAHBuilder();
    const inputs = [
      { keywords: ['Dallas', 'TX'], data: 'Vibe: Metropolitan | Fact: Arts District | Amenity: Transit' },
      { keywords: ['Keller'], data: 'Vibe: Suburban | Fact: Top Schools | Amenity: Parks' }
    ];

    const cartridgeBuffer = builder.forge(inputs);
    const retriever = new TAHRetriever(cartridgeBuffer);

    // Test Bloom Filter
    expect(retriever.containsKeyword('Dallas')).toBe(true);
    expect(retriever.containsKeyword('Keller')).toBe(true);
    expect(retriever.containsKeyword('Houston')).toBe(false);

    // Test Data Retrieval
    const dallasResults = retriever.search('Dallas');
    expect(dallasResults.length).toBe(1);
    expect(dallasResults[0].data).toContain('Metropolitan');

    const kellerResults = retriever.search('Keller');
    expect(kellerResults.length).toBe(1);
    expect(kellerResults[0].data).toContain('Suburban');
  });

  it('should handle case-insensitive lookups', () => {
    const builder = new TAHBuilder();
    const inputs = [{ keywords: ['Bowie'], data: 'Bowie data' }];
    const buffer = builder.forge(inputs);
    const retriever = new TAHRetriever(buffer);

    expect(retriever.containsKeyword('bowie')).toBe(true);
    expect(retriever.containsKeyword('BOWIE')).toBe(true);
  });
});
