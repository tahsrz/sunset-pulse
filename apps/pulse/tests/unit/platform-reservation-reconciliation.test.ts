import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ access: vi.fn(), rpc: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/platform/access/workspaceAccess.server', () => ({
  requireWorkspaceAccess: mocks.access,
  WorkspaceAccessError: class WorkspaceAccessError extends Error { constructor(public code: string, message: string) { super(message); } },
}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc: mocks.rpc } }));

import { WorkspaceAccessError } from '@/lib/platform/access/workspaceAccess.server';
import { runCapabilityReservationReconciliation } from '@/lib/platform/workflows/capabilityReservationReconciliation.server';

const workspace = '22222222-2222-4222-8222-222222222222';
const actor = '11111111-1111-4111-8111-111111111111';
const baseJob = {
  id: '44444444-4444-4444-8444-444444444444', user_id: actor,
  workflow_key: 'capability_reservation_reconcile', trigger_kind: 'event' as const, event_key: 'reconcile-1',
  payload_version: 1, scheduled_for: '2026-09-24T12:00:00.000Z', lease_token: '55555555-5555-4555-8555-555555555555',
  payload: { workspaceId: workspace, batchLimit: 50 },
};

describe('capability reservation reconciliation worker', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.access.mockResolvedValue({ workspaceId: workspace }); mocks.rpc.mockResolvedValue({ data: 12, error: null }); });

  it('rechecks owner/admin access and runs exactly one bounded service RPC', async () => {
    const result = await runCapabilityReservationReconciliation(baseJob);
    expect(mocks.access).toHaveBeenCalledWith(actor, workspace, 'workspace:manage_apps');
    expect(mocks.rpc).toHaveBeenCalledWith('platform_reconcile_capability_reservations', { p_workspace_id: workspace, p_limit: 50 });
    expect(result).toMatchObject({ kind: 'complete', resultType: 'quota_reconciliation', resultStatus: 'expired:12' });
  });

  it('completes safely without mutation after the requester loses authority', async () => {
    mocks.access.mockRejectedValue(new WorkspaceAccessError('FORBIDDEN', 'revoked'));
    const result = await runCapabilityReservationReconciliation(baseJob);
    expect(result).toMatchObject({ kind: 'complete', resultStatus: 'authorization_revoked' });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('rejects malformed or oversized batches before calling the service RPC', async () => {
    await expect(runCapabilityReservationReconciliation({ ...baseJob, payload: { workspaceId: workspace, batchLimit: 501 } })).rejects.toThrow(/payload/);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
