import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ pulseSearch: vi.fn(), heartbeat: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/ai/brain/pulse_query', () => ({ pulse_search_with_trace: mocks.pulseSearch }));
vi.mock('@/lib/core/wikipedia_heartbeat', () => ({ readWikipediaHeartbeat: mocks.heartbeat }));

import {
  buildJamieKnowledgeFallback,
  retrieveJamieKnowledge,
  shouldUseJamieKnowledgeFallback,
} from '@/lib/ai/jamieKnowledgeFallback';

describe('Jamie shared knowledge fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.heartbeat.mockResolvedValue({ status: 'healthy' });
  });

  it('returns cited TAH evidence instead of a listing dead end', async () => {
    mocks.pulseSearch.mockResolvedValue({
      results: [{
        source: 'wiki_en_example.tah',
        score: 0.91,
        text: 'TITLE: Ada Lovelace\nSOURCE_URL: https://en.wikipedia.org/wiki/Ada_Lovelace\n\nAda Lovelace wrote notes on the Analytical Engine.',
      }],
      trace: { durationMs: 12, searchedCartridges: ['wiki_en_example.tah'] },
    });
    const context = await retrieveJamieKnowledge('Who was Ada Lovelace?');
    const answer = buildJamieKnowledgeFallback(context);

    expect(answer).toContain('Ada Lovelace wrote notes');
    expect(answer).toContain('https://en.wikipedia.org/wiki/Ada_Lovelace');
    expect(context.trace?.searchedCartridges).toContain('wiki_en_example.tah');
    expect(shouldUseJamieKnowledgeFallback('No active listings found.')).toBe(true);
  });

  it('reports active acquisition when no cartridge match exists', async () => {
    mocks.pulseSearch.mockResolvedValue({ results: [], trace: { durationMs: 4, searchedCartridges: [] } });
    const context = await retrieveJamieKnowledge('New topic');
    expect(buildJamieKnowledgeFallback(context)).toContain('crawler is active');
  });
});
