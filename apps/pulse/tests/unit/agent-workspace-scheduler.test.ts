import { describe, expect, it } from 'vitest';
import { SubmissionScheduler } from '@/lib/agent-workspace/submissionScheduler';
import type { AgentSession } from '@/lib/agent-workspace/types';

const agent = (id: string): AgentSession => ({ id, workerId: 'follow-up-writer', label: id, assignment: 'write follow-ups', assignmentRevision: 1, autoListenEnabled: true, spawnedAtSequence: 0, draftText: '', draftDirty: false, draftRevision: 0, transcriptCursor: 0 });

describe('agent workspace scheduler', () => {
  it('enforces one agent/two global slots and automatic cooldown', () => {
    const agents = { a: agent('a'), b: agent('b'), c: agent('c') };
    const scheduler = new SubmissionScheduler(() => agents, () => false);
    const first = scheduler.tryReserve({ agentId: 'a', source: 'automatic', text: 'follow up now', triggerId: 't1', now: 100_000 });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    scheduler.start(first.reservation.runId, 100_000);
    const duplicate = scheduler.tryReserve({ agentId: 'a', source: 'automatic', text: 'follow up now', triggerId: 't1', now: 100_001 });
    expect(duplicate.ok).toBe(true);
    const cooldown = scheduler.tryReserve({ agentId: 'a', source: 'automatic', text: 'another request', triggerId: 't2', now: 101_000 });
    expect(cooldown.ok).toBe(false);
    const second = scheduler.tryReserve({ agentId: 'b', source: 'automatic', text: 'follow up buyer', triggerId: 't3', now: 101_000 });
    expect(second.ok).toBe(true);
    if (second.ok) scheduler.start(second.reservation.runId, 101_000);
    expect(scheduler.tryReserve({ agentId: 'c', source: 'manual', text: 'manual request', now: 101_000 }).ok).toBe(false);
  });

  it('keeps a cancelled/in-flight reservation counted until completion', () => {
    const agents = { a: agent('a'), b: agent('b') };
    const scheduler = new SubmissionScheduler(() => agents, () => false);
    const reservation = scheduler.tryReserve({ agentId: 'a', source: 'manual', text: 'one' });
    expect(reservation.ok).toBe(true);
    if (!reservation.ok) return;
    scheduler.start(reservation.reservation.runId);
    const second = scheduler.tryReserve({ agentId: 'b', source: 'manual', text: 'two' });
    expect(second.ok).toBe(true);
  });

  it('bounds batched attention assessments', () => {
    const scheduler = new SubmissionScheduler(() => ({ a: agent('a') }), () => false);
    for (let index = 0; index < 6; index += 1) expect(scheduler.tryReserveAssessment(10_000 + index)).toBe(true);
    expect(scheduler.tryReserveAssessment(10_010)).toBe(false);
    expect(scheduler.tryReserveAssessment(70_001)).toBe(true);
  });
});
