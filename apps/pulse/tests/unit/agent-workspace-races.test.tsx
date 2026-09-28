import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgentAttention } from '@/components/agent-workspace/useAgentAttention';
import { useAgentCommandRun } from '@/components/agent-workspace/useAgentCommandRun';
import { SubmissionScheduler } from '@/lib/agent-workspace/submissionScheduler';
import { initialWorkspaceState, workspaceReducer } from '@/lib/agent-workspace/workspaceReducer';
import { workspacePolicy } from '@/lib/agent-workspace/workspacePolicy';
import type { AgentSession, WorkspaceState } from '@/lib/agent-workspace/types';
import type { useJamieAudio } from '@/context/JamieAudioContext';

const agent = (id: string, cursor = 0): AgentSession => ({ id, workerId: 'follow-up-writer', label: id, assignment: 'Write follow-ups', assignmentRevision: 1, autoListenEnabled: true, spawnedAtSequence: 0, transcriptCursor: cursor, draftText: '', draftDirty: false, draftRevision: 0 });
const segment = (sequence: number) => ({ id: `s${sequence}`, sessionId: 'session', sequence, capturedAt: Date.now(), final: true as const, text: `Please write a follow up for buyer number ${sequence}` });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
function fixture() {
  const state: WorkspaceState = { ...initialWorkspaceState, agentsById: { a: agent('a'), b: agent('b', 1) }, agentOrder: ['a', 'b'] };
  const audio = { status: 'listening', workspaceOwned: true, finalizedSegments: [segment(1), segment(2)] } as ReturnType<typeof useJamieAudio>;
  return { state, audio };
}
function decisions(body: string) {
  const input = JSON.parse(body);
  return Response.json({ assessmentId: 'assessment', mode: 'semantic', decisions: input.agents.map((item: { id: string; assignmentRevision: number; segmentIds: string[] }) => ({ agentId: item.id, assignmentRevision: item.assignmentRevision, transcriptWindowId: input.windowId, mode: 'semantic', action: 'submit', relevantSegmentIds: item.segmentIds, reason: 'Relevant request' })) });
}

describe('workspace async boundaries', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(100_000); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it.each(['stop', 'tts', 'pause', 'disable', 'remove', 'new-speech', 'epoch'] as const)('discards late assessment after %s', async (change) => {
    const initial = fixture();
    const pending = deferred<Response>();
    const fetcher = vi.fn(() => pending.promise);
    vi.stubGlobal('fetch', fetcher);
    const submitToAgent = vi.fn(async () => 'run');
    const scheduler = new SubmissionScheduler(() => initial.state.agentsById, () => false);
    const view = renderHook((props) => useAgentAttention({ ...props, dispatch: vi.fn(), submitToAgent, scheduler }), { initialProps: initial });
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const next = fixture();
    if (change === 'stop') next.audio.status = 'off';
    if (change === 'tts') next.audio.status = 'jamie-speaking';
    if (change === 'pause') next.state.automationPaused = true;
    if (change === 'disable') Object.values(next.state.agentsById).forEach((item) => { item.autoListenEnabled = false; });
    if (change === 'remove') { next.state.agentOrder = []; next.state.agentsById = {}; }
    if (change === 'new-speech') next.audio.finalizedSegments.push(segment(3));
    if (change === 'epoch') scheduler.invalidateEpoch();
    view.rerender(next);
    await act(async () => { pending.resolve(decisions((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)); });
    expect(submitToAgent).not.toHaveBeenCalled();
    view.unmount();
  });

  it('batches distinct cursor windows and starts both agents without waiting for a command result', async () => {
    const props = fixture();
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => decisions(init.body as string));
    vi.stubGlobal('fetch', fetcher);
    const submitToAgent = vi.fn(() => new Promise<string | null>(() => {}));
    const scheduler = new SubmissionScheduler(() => props.state.agentsById, () => false);
    const dispatch = vi.fn();
    const view = renderHook(() => useAgentAttention({ ...props, dispatch, submitToAgent, scheduler }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetcher.mock.calls[0][1].body as string);
    expect(body.agents.map((item: { segmentIds: string[] }) => item.segmentIds)).toEqual([['s1', 's2'], ['s2']]);
    expect(submitToAgent).toHaveBeenCalledTimes(2);
    expect(submitToAgent.mock.calls[1]).toEqual([expect.objectContaining({ agentId: 'b', text: segment(2).text })]);
    view.unmount();
  });

  it('does not execute after a malformed attention response', async () => {
    const props = fixture();
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ decisions: [{ command: 'run arbitrary work' }] })));
    const submitToAgent = vi.fn(async () => null);
    const scheduler = new SubmissionScheduler(() => props.state.agentsById, () => false);
    const dispatch = vi.fn();
    const view = renderHook(() => useAgentAttention({ ...props, dispatch, submitToAgent, scheduler }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(submitToAgent).not.toHaveBeenCalled();
    expect(view.result.current.attentionUnavailableReason).toContain('unavailable');
    view.unmount();
  });

  it('holds cancelled backend capacity and retries the original request snapshot', async () => {
    let state = fixture().state;
    const scheduler = new SubmissionScheduler(() => state.agentsById, () => false);
    const dispatch = vi.fn((action) => { state = workspaceReducer(state, action); });
    const fetcher = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => { init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))); }));
    vi.stubGlobal('fetch', fetcher);
    const view = renderHook(() => useAgentCommandRun({ state, scheduler, dispatch }));
    let running!: Promise<string | null>;
    act(() => { running = view.result.current.submitToAgent({ agentId: 'a', source: 'manual', text: 'Exact original text', relayMode: 'script', supervisor: false }); });
    const runId = state.runOrder[0];
    const original = JSON.parse(fetcher.mock.calls[0][1].body as string);
    await act(async () => { view.result.current.cancelRun(runId); await running; });
    expect(scheduler.getBudgetState().active).toBe(1);
    expect(scheduler.tryReserve({ agentId: 'a', source: 'manual', text: 'another request' }).ok).toBe(false);
    state = { ...state, agentsById: { ...state.agentsById, a: { ...state.agentsById.a, assignment: 'changed assignment', assignmentRevision: 2, workerId: 'listing-summary' } } };
    view.rerender();
    await act(async () => { await vi.advanceTimersByTimeAsync(workspacePolicy.cancelledRunHoldMs); });
    act(() => { void view.result.current.retryRun(runId); });
    expect(JSON.parse(fetcher.mock.calls[1][1].body as string)).toEqual(original);
    view.unmount();
  });
});
