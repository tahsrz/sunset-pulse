import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn(), from: vi.fn(), rpc: vi.fn(), enqueue: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({ requireSignedInUser: mocks.auth, isAuthResponse: (value: unknown) => value instanceof Response }));
vi.mock('@/lib/platform/access/workspaceAccess.server', () => ({
  requireWorkspaceAccess: mocks.access,
  WorkspaceAccessError: class WorkspaceAccessError extends Error { constructor(public code: string, message: string) { super(message); } },
}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mocks.from, rpc: mocks.rpc } }));
vi.mock('@/lib/autonomous-workflows/schedulerEvents.server', () => ({
  enqueueCapabilityReservationReconciliation: mocks.enqueue,
  SchedulerEventError: class SchedulerEventError extends Error { constructor(public code: 'DISABLED' | 'FAILED') { super(); } },
}));

import { GET, PATCH } from '@/app/api/workspaces/[workspaceId]/quotas/route';
import { POST } from '@/app/api/workspaces/[workspaceId]/quotas/reconcile/route';

const actor = '11111111-1111-4111-8111-111111111111';
const workspace = '22222222-2222-4222-8222-222222222222';
const context = () => ({ params: Promise.resolve({ workspaceId: workspace }) });
const request = (path: string, method = 'GET', body?: unknown, origin = 'http://localhost') => new NextRequest(`http://localhost/api/workspaces/${workspace}/${path}`, {
  method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), Origin: origin },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const budget = {
  maxConcurrentOperations: 2, maxStepsPerRun: 20, maxEstimatedCostUsd: 2,
  maxTokensPerRun: 50000, maxRunEstimatedCostUsd: 1, maxRunDurationSeconds: 1800, expectedRevision: null,
};

describe('workspace quota routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: actor }, allowed: true, mode: 'user' });
    mocks.access.mockResolvedValue({ workspaceId: workspace });
    const builder = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
    builder.select.mockReturnValue(builder); builder.eq.mockReturnValue(builder);
    builder.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.from.mockReturnValue(builder);
    mocks.rpc.mockResolvedValue({ data: [{ revision: 1 }], error: null });
    mocks.enqueue.mockResolvedValue({ id: '44444444-4444-4444-8444-444444444444', workflow_key: 'capability_reservation_reconcile', event_key: 'reconcile-1', status: 'queued' });
  });

  it('requires owner/admin access to read and revision-save quota settings', async () => {
    const get = await GET(request('quotas'), context());
    expect(get.status).toBe(200);
    expect(mocks.access).toHaveBeenCalledWith(actor, workspace, 'workspace:manage_apps');
    const patch = await PATCH(request('quotas', 'PATCH', budget), context());
    expect(patch.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('platform_save_quota_budget', expect.objectContaining({ p_actor_id: actor, p_workspace_id: workspace, p_expected_revision: null }));
  });

  it('rejects cross-origin saves before access or persistence', async () => {
    const result = await PATCH(request('quotas', 'PATCH', budget, 'https://foreign.example'), context());
    expect(result.status).toBe(403);
    expect(mocks.access).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('schedules only bounded reconciliation events after owner/admin authorization', async () => {
    const result = await POST(request('quotas/reconcile', 'POST', { eventKey: 'reconcile-1' }), context());
    expect(result.status).toBe(200);
    expect(mocks.access).toHaveBeenCalledWith(actor, workspace, 'workspace:manage_apps');
    expect(mocks.enqueue).toHaveBeenCalledWith(expect.objectContaining({ userId: actor, workspaceId: workspace, eventKey: 'reconcile-1', batchLimit: 100 }));
  });
});
