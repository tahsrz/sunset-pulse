import { describe, expect, it } from 'vitest';
import { runDefinitionSchema } from '@/lib/platform/contracts/run';

const definition = {
  schemaVersion: 1, key: 'readiness', version: 1, entry: 'ask', nodes: [
    { id: 'ask', kind: 'checkpoint', type: 'question', prompt: 'Which area?', responseSchema: { type: 'string', enum: ['Keller', 'Westlake'] }, next: 'done' },
    { id: 'done', kind: 'complete' },
  ],
};

describe('versioned JSON run definitions', () => {
  it('accepts serializable graphs independent of a business vertical', () => {
    expect(runDefinitionSchema.parse(JSON.parse(JSON.stringify(definition)))).toEqual(definition);
  });
  it.each(['cycle', 'missing', 'duplicate', 'unreachable', 'version', 'code'])('rejects %s definitions before admission', (failure) => {
    const graph = JSON.parse(JSON.stringify(definition));
    if (failure === 'cycle') graph.nodes[0].next = 'ask';
    if (failure === 'missing') graph.nodes[0].next = 'missing';
    if (failure === 'duplicate') graph.nodes.push(graph.nodes[0]);
    if (failure === 'unreachable') graph.nodes.push({ id: 'unused', kind: 'complete' });
    if (failure === 'version') graph.schemaVersion = 2;
    if (failure === 'code') graph.nodes[0].script = 'fetch(process.env.SECRET)';
    expect(runDefinitionSchema.safeParse(graph).success).toBe(false);
  });
  it.each(['approval', 'effect_gate'])('requires an exact target for %s', (type) => {
    const graph = JSON.parse(JSON.stringify(definition));
    graph.nodes[0] = { id: 'ask', kind: 'checkpoint', type, prompt: 'Review', next: 'done' };
    expect(runDefinitionSchema.safeParse(graph).success).toBe(false);
    graph.nodes[0].target = { resourceType: 'brief', resourceId: 'brief-1', revision: 3, contentHash: 'a'.repeat(64), action: 'review' };
    expect(runDefinitionSchema.safeParse(graph).success).toBe(true);
  });
});
