import { describe, expect, it } from 'vitest';
import { initialWorkspaceState, workspaceReducer } from '@/lib/agent-workspace/workspaceReducer';
import type { AgentSession } from '@/lib/agent-workspace/types';

const agent = (id: string): AgentSession => ({ id, workerId: 'follow-up-writer', label: `Follow ${id}`, assignment: 'Write follow-ups', assignmentRevision: 1, autoListenEnabled: false, spawnedAtSequence: 0, draftText: '', draftDirty: false, draftRevision: 0, transcriptCursor: 0 });

describe('agent workspace state', () => {
  it('keeps same-role agents and their drafts independent', () => {
    let state = workspaceReducer(initialWorkspaceState, { type: 'SPAWN_AGENT', agent: agent('a') });
    state = workspaceReducer(state, { type: 'SPAWN_AGENT', agent: agent('b') });
    state = workspaceReducer(state, { type: 'SET_DRAFT', agentId: 'a', text: 'A request' });
    expect(state.agentOrder).toEqual(['a', 'b']);
    expect(state.agentsById.b.draftText).toBe('');
    expect(state.agentsById.a.id).not.toBe(state.agentsById.b.id);
  });

  it('ignores a result for a different run or agent', () => {
    const state = workspaceReducer(initialWorkspaceState, { type: 'SPAWN_AGENT', agent: agent('a') });
    const result = { commandId: 'c', worker: { id: 'follow-up-writer', name: 'Follow', role: 'writer' }, result: { title: 'Done', summary: 'ok', actions: [], confidence: 80, deliverable: { title: 'Done', copyReadyText: 'text', sourceSummary: '' } } };
    const withRun = workspaceReducer(state, { type: 'RUN_STARTED', run: { id: 'r', agentId: 'a', source: 'manual', submittedText: 'x', commandText: 'x', state: 'running', progress: [], startedAt: 1 } });
    expect(workspaceReducer(withRun, { type: 'RUN_COMPLETED', runId: 'wrong', agentId: 'a', response: result, finishedAt: 2 })).toEqual(withRun);
  });

  it('removes one session without removing another', () => {
    let state = workspaceReducer(initialWorkspaceState, { type: 'SPAWN_AGENT', agent: agent('a') });
    state = workspaceReducer(state, { type: 'SPAWN_AGENT', agent: agent('b') });
    state = workspaceReducer(state, { type: 'REMOVE_AGENT', agentId: 'a' });
    expect(state.agentOrder).toEqual(['b']);
    expect(state.agentsById.a).toBeUndefined();
  });
});

