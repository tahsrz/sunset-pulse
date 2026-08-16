import './load-env.js';
import { retrieveJamieKnowledge } from '@/lib/ai/jamieKnowledgeFallback';
import { evaluateRetrievalFixture, listRetrievalEvaluationFixtures } from '@/lib/ai/retrievalEvaluation';
import { enqueueWikipediaDemand } from '@/lib/wikipedia/crawl4aiWikipedia';

async function main() {
  const requestedLimit = Number(process.argv.find((argument) => argument.startsWith('--limit='))?.split('=')[1]);
  const fixtures = listRetrievalEvaluationFixtures().slice(0, Number.isInteger(requestedLimit) && requestedLimit > 0 ? requestedLimit : undefined);
  const rows = [];

  for (const fixture of fixtures) {
    const context = await retrieveJamieKnowledge(fixture.question);
    const evaluation = evaluateRetrievalFixture(fixture, context);
    rows.push({
      id: fixture.id,
      passed: evaluation.passed,
      hints: evaluation.matchedHints.join(', ') || '-',
      evidence: context.evidence.length,
      searched: context.trace?.searchedCartridges.length || 0,
      latencyMs: context.trace?.durationMs || 0,
      stop: context.trace?.stopReason || 'unavailable',
    });
  }

  console.table(rows);
  const passed = rows.filter((row) => row.passed).length;
  const averageLatencyMs = rows.length
    ? Math.round(rows.reduce((total, row) => total + row.latencyMs, 0) / rows.length)
    : 0;
  if (!process.argv.includes('--no-enqueue')) {
    const failedIds = new Set(rows.filter((row) => !row.passed).map((row) => row.id));
    enqueueWikipediaDemand(fixtures
      .filter((fixture) => failedIds.has(fixture.id) && fixture.id.startsWith('wikipedia-'))
      .map((fixture) => ({ query: fixture.question, reason: `retrieval evaluation: ${fixture.id}` })));
  }
  console.log(JSON.stringify({ fixtures: rows.length, passed, passRate: rows.length ? Math.round((passed / rows.length) * 100) : 0, averageLatencyMs }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
