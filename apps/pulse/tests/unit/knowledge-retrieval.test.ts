import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ pulseSearch: vi.fn(), heartbeat: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/ai/brain/pulse_query', () => ({ pulse_search_with_trace: mocks.pulseSearch }));
vi.mock('@/lib/core/wikipedia_heartbeat', () => ({ readWikipediaHeartbeat: mocks.heartbeat }));

import {
  clearKnowledgeRetrievalCacheForTests,
  formatKnowledgePrompt,
  retrieveKnowledge,
} from '@/lib/ai/knowledgeRetrieval';

describe('shared knowledge retrieval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearKnowledgeRetrievalCacheForTests();
    mocks.heartbeat.mockResolvedValue({ status: 'healthy' });
  });

  it('normalizes cartridge matches into an agent-neutral evidence contract', async () => {
    mocks.pulseSearch.mockResolvedValue({
      results: [{
        source: 'wiki_en_ada.tah',
        score: 0.91,
        text: 'TITLE: Ada Lovelace\nSOURCE_URL: https://en.wikipedia.org/wiki/Ada_Lovelace\n\nAda wrote notes about the Analytical Engine.',
      }],
      trace: { resultCount: 1 },
    });

    const context = await retrieveKnowledge('  Who   was Ada Lovelace?  ', { limit: 4 });

    expect(mocks.pulseSearch).toHaveBeenCalledWith('Who was Ada Lovelace?', 4);
    expect(context).toMatchObject({
      query: 'Who was Ada Lovelace?',
      crawlerStatus: 'healthy',
      evidence: [{
        source: 'wiki_en_ada.tah',
        title: 'Ada Lovelace',
        excerpt: 'Ada wrote notes about the Analytical Engine.',
        url: 'https://en.wikipedia.org/wiki/Ada_Lovelace',
        score: 0.91,
      }],
    });
  });

  it('returns a stable empty context when the query has no content', async () => {
    await expect(retrieveKnowledge('   ')).resolves.toEqual({
      query: '',
      evidence: [],
      crawlerStatus: 'unknown',
      trace: null,
    });
    expect(mocks.pulseSearch).not.toHaveBeenCalled();
  });

  it('formats evidence as isolated reference data for any model consumer', async () => {
    mocks.pulseSearch.mockResolvedValue({
      results: [{ source: 'facts.tah', score: 1, text: 'TITLE: Fact\nVerified context.' }],
      trace: null,
    });

    const prompt = formatKnowledgePrompt(await retrieveKnowledge('fact'));

    expect(prompt).toContain('SERVER-AUTHORITATIVE TAH KNOWLEDGE');
    expect(prompt).toContain('<reference_data>');
    expect(prompt).toContain('Verified context.');
  });
});
