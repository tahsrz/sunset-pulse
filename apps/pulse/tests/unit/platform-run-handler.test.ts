import { beforeEach, expect, it, vi } from 'vitest';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc } }));
import { runPlatformWorkflow } from '@/lib/platform/workflows/runHandler.server';
const job = { id: crypto.randomUUID(), user_id: crypto.randomUUID(), workflow_key: 'platform_run', lease_token: crypto.randomUUID(), scheduled_for: new Date().toISOString() };
beforeEach(() => rpc.mockReset());
it('passes only a persisted job identity and lease to the atomic transition', async () => {
  rpc.mockResolvedValue({ data: [{ run_id: 'run-1', run_status: 'waiting' }], error: null });
  expect(await runPlatformWorkflow(job)).toEqual({ kind: 'committed', resultId: 'run-1', resultStatus: 'waiting' });
  expect(rpc).toHaveBeenCalledWith('platform_tick_run', { p_job_id: job.id, p_lease_token: job.lease_token });
});
it('does not manufacture a committed result when the lease is rejected', async () => {
  rpc.mockResolvedValue({ data: null, error: { code: '40001' } });
  await expect(runPlatformWorkflow(job)).rejects.toThrow('Unable to advance');
});
