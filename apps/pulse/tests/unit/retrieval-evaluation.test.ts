import { describe, expect, it } from 'vitest';
import { evaluateRetrievalFixture, listRetrievalEvaluationFixtures } from '@/lib/ai/retrievalEvaluation';

describe('retrieval evaluation fixtures', () => {
  it('keeps a diverse 20-question evaluation corpus', () => {
    const fixtures = listRetrievalEvaluationFixtures();
    expect(fixtures).toHaveLength(20);
    expect(new Set(fixtures.map((fixture) => fixture.category)).size).toBeGreaterThanOrEqual(10);
    expect(fixtures.every((fixture) => fixture.expectedHints.length > 0)).toBe(true);
  });

  it('scores a fixture from selected evidence rather than the query text', () => {
    const fixture = listRetrievalEvaluationFixtures().find((item) => item.id === 'wikipedia-computing')!;
    const context = {
      query: fixture.question,
      crawlerStatus: 'healthy',
      trace: null,
      evidence: [{
        source: 'wiki_en_linux.tah',
        title: 'Linux kernel',
        excerpt: 'Linus Torvalds created the Linux kernel.',
        url: 'https://en.wikipedia.org/wiki/Linux_kernel',
        score: 0.9,
      }],
    };
    expect(evaluateRetrievalFixture(fixture, context)).toMatchObject({ passed: true, evidenceCount: 1 });
    expect(evaluateRetrievalFixture({ ...fixture, expectedHints: ['unrelated-token'] }, context).passed).toBe(false);
  });
});
