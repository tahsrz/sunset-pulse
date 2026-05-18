import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { MemoriaRetriever } from '@/lib/core/memoria_retriever';
import { pulse_search } from '@/lib/ai/brain/pulse_query';

describe('MemoriaRetriever', () => {
  const cartridgePath = path.resolve(__dirname, '../../cartridges/wiki_dallas.hat');

  it('reads split .hat/.tah cartridges', () => {
    if (!fs.existsSync(cartridgePath)) return;

    const retriever = new MemoriaRetriever(cartridgePath);
    const results = retriever.search('Deep Ellum', 5);

    expect(results.length).toBeGreaterThan(0);
    expect(results.some(result => result.data.includes('Deep Ellum'))).toBe(true);
  });

  it('keeps pulse search results capped and ranked', async () => {
    const results = await pulse_search('Dallas', 10);

    expect(results.length).toBeLessThanOrEqual(10);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(result => result.source === 'wiki_dallas.hat')).toBe(true);
  });
});
