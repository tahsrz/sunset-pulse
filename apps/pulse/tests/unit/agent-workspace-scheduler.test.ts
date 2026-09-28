import { describe, expect, it } from 'vitest';
import { SubmissionScheduler } from '@/lib/agent-workspace/submissionScheduler';
import type { AgentSession } from '@/lib/agent-workspace/types';

const agent = (id: string): AgentSession => ({ id, workerId: 'follow-up-writer', label: id, assignment: 'write follow-ups', assignmentRevision: 1, autoListenEnabled: true, spawnedAtSequence: 0, draftText: '', draftDirty: false, draftRevision: 0, transcriptCursor: 0 });

describe('agent workspace scheduler', () => {
  it('counts reservations before start and rechecks capture before dispatch', () => {
    const agents = { a: agent('a'), b: agent('b'), c: agent('c') };
    let capture = true;
    const scheduler = new SubmissionScheduler(() => agents, () => false, () => capture);
    const first = scheduler.tryReserve({ agentId: 'a', text: 'one', source: 'automatic' });
    const second = scheduler.tryReserve({ agentId: 'b', text: 'two', source: 'manual' });
    expect(first.ok && second.ok).toBe(true);
    expect(scheduler.tryReserve({ agentId: 'c', text: 'three', source: 'manual' }).ok).toBe(false);
    capture = false;
    if (first.ok) expect(scheduler.start(first.reservation.runId)).toBe(false);
    expect(scheduler.tryReserve({ agentId: 'c', text: 'three', source: 'manual' }).ok).toBe(true);
  });

  it('enforces minute and hourly start budgets, with manual requests exempt from automatic quotas', () => {
    const agents = { a: agent('a'), b: agent('b') };
    const scheduler = new SubmissionScheduler(() => agents, () => false);
    const start = (agentId: string, now: number) => {
      const reserved = scheduler.tryReserve({ agentId, text: `request ${now}`, source: 'automatic', now });
      expect(reserved.ok).toBe(true);
      if (!reserved.ok) return;
      expect(scheduler.start(reserved.reservation.runId, now)).toBe(true);
      scheduler.completeRun(reserved.reservation.runId);
    };
    start('a', 100_000); start('b', 100_000); start('a', 120_000); start('b', 120_000);
    expect(scheduler.tryReserve({ agentId: 'a', text: 'fifth', source: 'automatic', now: 140_000 }).ok).toBe(false);
    for (let index = 0; index < 16; index += 1) start('a', 200_000 + index * 61_000);
    expect(scheduler.getBudgetState(1_200_000).hour).toBe(20);
    expect(scheduler.tryReserve({ agentId: 'b', text: 'twenty first', source: 'automatic', now: 1_200_000 }).ok).toBe(false);
    expect(scheduler.tryReserve({ agentId: 'b', text: 'manual still works', source: 'manual', now: 1_200_000 }).ok).toBe(true);
  });
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
