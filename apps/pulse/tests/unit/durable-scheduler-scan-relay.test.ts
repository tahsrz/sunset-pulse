import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), reconcileScans: vi.fn() }));

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mocks.from, rpc: mocks.rpc } }));
vi.mock('@/lib/autonomous-workflows/workflowRegistry.server', () => ({ getWorkflowHandler: vi.fn() }));
vi.mock('@/lib/scans/scanJobReconciler.server', () => ({ reconcilePendingPropertyScanReconstructionIntents: mocks.reconcileScans }));

import { enqueueDueWorkflowJobs } from '@/lib/autonomous-workflows/durableScheduler.server';

describe('shared scheduler scan outbox relay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      lte: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.lte.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockResolvedValue({ data: [], error: null });
    mocks.from.mockReturnValue(query);
    mocks.reconcileScans.mockResolvedValue({ scanned: 0, acknowledged: 0, stale: 0, retryable: 0 });
  });

  it('relays a bounded scan-intent batch on the existing due-schedule tick', async () => {
    const result = await enqueueDueWorkflowJobs();

    expect(mocks.reconcileScans).toHaveBeenCalledWith(10);
    expect(result).toEqual({
      schedules: 0,
      queued: 0,
      scanReconciliation: { scanned: 0, acknowledged: 0, stale: 0, retryable: 0 },
    });
  });
});
