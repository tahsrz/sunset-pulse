import { describe, expect, it, vi } from 'vitest';
import { withRetry } from '@/lib/core/withRetry';
import { derivePipelineHealth } from '@/lib/data/pipelineHealth';

describe('pipeline hardening', () => {
  it('retries transient failures with bounded exponential backoff', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('connection reset'), { code: '08006' }))
      .mockRejectedValueOnce(Object.assign(new Error('deadlock'), { code: '40P01' }))
      .mockResolvedValue('written');
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(withRetry(operation, { sleep, baseDelayMs: 25 })).resolves.toBe('written');
    expect(operation).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 25);
    expect(sleep).toHaveBeenNthCalledWith(2, 50);
  });

  it('does not retry validation failures', async () => {
    const operation = vi.fn().mockRejectedValue(Object.assign(new Error('invalid row'), { code: '23514' }));
    await expect(withRetry(operation, { sleep: vi.fn() })).rejects.toThrow('invalid row');
    expect(operation).toHaveBeenCalledOnce();
  });

  it('marks stale and high-failure sync runs as unhealthy', () => {
    const now = new Date('2026-06-30T18:00:00.000Z');
    const staleRun = run({
      status: 'completed',
      completedAt: '2026-06-30T08:00:00.000Z',
      metrics: { received: 100, synced: 80, skipped: 0, failed: 20 },
    });
    const health = derivePipelineHealth({ latest: staleRun, latestCompleted: staleRun, runningCount: 0 }, now);

    expect(health.status).toBe('degraded');
    expect(health.lagMs).toBe(10 * 60 * 60 * 1_000);
    expect(health.failureRate).toBe(0.2);
    expect(health.reasons).toHaveLength(2);
  });
});

function run(overrides: Record<string, unknown>) {
  return {
    id: 'run-1', provider: 'repliers', status: 'completed', params: {},
    startedAt: '2026-06-30T07:59:00.000Z', updatedAt: '2026-06-30T08:00:00.000Z',
    completedAt: '2026-06-30T08:00:00.000Z', durationMs: 60_000,
    metrics: { received: 1, synced: 1, skipped: 0, failed: 0 }, failures: [],
    ...overrides,
  } as any;
}
