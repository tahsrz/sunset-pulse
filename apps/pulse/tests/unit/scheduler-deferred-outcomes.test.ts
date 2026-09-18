import { describe, expect, it, vi } from 'vitest';

const handler = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc } }));
vi.mock('@/lib/autonomous-workflows/workflowRegistry.server', () => ({
  getWorkflowHandler: () => handler,
}));

import { processQueuedWorkflowJobs } from '@/lib/autonomous-workflows/durableScheduler.server';

describe('durable scheduler deferred outcomes', () => {
  it('accepts an atomic platform receipt without a second completion or deferral', async () => {
    rpc.mockReset(); handler.mockReset();
    rpc.mockResolvedValueOnce({ data: 0, error: null }).mockResolvedValueOnce({ data: [{ id: 'job-p', workflow_key: 'platform_run' }], error: null });
    handler.mockResolvedValue({ kind: 'committed', resultId: 'run-p', resultStatus: 'waiting' });
    expect(await processQueuedWorkflowJobs(1)).toEqual({ processed: 1, results: [{ jobId: 'job-p', status: 'waiting', runId: 'run-p' }] });
    expect(rpc).toHaveBeenCalledTimes(2);
    rpc.mockReset(); handler.mockReset();
  });
  it('persists a handler deferral without attempting terminal completion', async () => {
    const job = {
      id: 'job-1',
      user_id: 'user-1',
      workflow_key: 'sprint_planner',
      scheduled_for: '2026-09-16T13:00:00.000Z',
      lease_token: 'lease-1',
    };
    handler.mockResolvedValue({ kind: 'defer', nextPollAt: new Date(Date.now() + 60_000).toISOString(), reason: 'Awaiting source' });
    rpc
      .mockResolvedValueOnce({ data: 0, error: null })
      .mockResolvedValueOnce({ data: [job], error: null })
      .mockResolvedValueOnce({ data: [{ status: 'deferred' }], error: null });

    const result = await processQueuedWorkflowJobs(1);

    expect(result).toEqual({ processed: 1, results: [{ jobId: 'job-1', status: 'deferred' }] });
    expect(rpc).toHaveBeenNthCalledWith(3, 'defer_workflow_job', {
      p_job_id: 'job-1',
      p_lease_token: 'lease-1',
      p_next_poll_at: expect.any(String),
      p_reason: 'Awaiting source',
    });
    expect(rpc).not.toHaveBeenCalledWith('complete_workflow_job_with_result', expect.anything());
  });
});
