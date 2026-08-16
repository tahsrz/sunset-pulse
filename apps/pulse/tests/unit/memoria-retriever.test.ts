import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { MemoriaRetriever } from '@/lib/core/memoria_retriever';
import { listPulseCartridges, pulse_search, pulse_search_with_trace } from '@/lib/ai/brain/pulse_query';

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
    expect(results.every((result, index) => index === 0 || result.score <= results[index - 1].score)).toBe(true);
  }, 15_000);

  it('lists queryable cartridges without duplicate memoria pairs', () => {
    const cartridges = listPulseCartridges();
    const names = cartridges.map(cartridge => cartridge.name);

    expect(names).toContain('wiki_dallas.hat');
    expect(names).not.toContain('wiki_dallas.tah');
  });

  it('reports bounded cartridge selection and retrieval latency', async () => {
    const { results, trace } = await pulse_search_with_trace('Dallas', 4);
    expect(results.length).toBeLessThanOrEqual(4);
    expect(trace.query).toBe('Dallas');
    expect(trace.durationMs).toBeGreaterThanOrEqual(0);
    expect(trace.searchedCartridges.length).toBeLessThanOrEqual(trace.searchLimit);
    expect(trace.resultCount).toBe(results.length);
  }, 15_000);
});
