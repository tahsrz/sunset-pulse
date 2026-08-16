import fixtures from '@/config/retrieval-evaluation-fixtures.json';
import type { JamieKnowledgeContext } from '@/lib/ai/jamieKnowledgeFallback';

export type RetrievalEvaluationFixture = {
  id: string;
  question: string;
  expectedHints: string[];
  category: string;
};

export function listRetrievalEvaluationFixtures(): RetrievalEvaluationFixture[] {
  return fixtures;
}

export function evaluateRetrievalFixture(fixture: RetrievalEvaluationFixture, context: JamieKnowledgeContext) {
  const minimumMatches = Math.min(2, fixture.expectedHints.length);
  const evidenceMatches = context.evidence.map((item) => {
    const haystack = `${item.source} ${item.title} ${item.excerpt} ${item.url || ''}`.toLowerCase();
    return fixture.expectedHints.filter((hint) => haystack.includes(hint.toLowerCase()));
  });
  const matchedHints = evidenceMatches.sort((left, right) => right.length - left.length)[0] || [];
  return {
    fixtureId: fixture.id,
    passed: matchedHints.length >= minimumMatches,
    matchedHints,
    expectedHints: fixture.expectedHints,
    minimumMatches,
    evidenceCount: context.evidence.length,
  };
}
