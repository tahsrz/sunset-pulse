import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn(), from: vi.fn(), rpc: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({ requireSignedInUser: mocks.auth, isAuthResponse: (value: unknown) => value instanceof Response }));
vi.mock('@/lib/platform/access/workspaceAccess.server', () => ({
  requireWorkspaceAccess: mocks.access,
  WorkspaceAccessError: class WorkspaceAccessError extends Error { constructor(public code: string, message: string) { super(message); } },
}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mocks.from, rpc: mocks.rpc } }));

import { GET, POST } from '@/app/api/workspaces/[workspaceId]/quotas/providers/route';
import { POST as revoke } from '@/app/api/workspaces/[workspaceId]/provider-adapters/[reviewId]/revoke/route';

const actor = '11111111-1111-4111-8111-111111111111';
const workspace = '22222222-2222-4222-8222-222222222222';
const review = '33333333-3333-4333-8333-333333333333';
const context = () => ({ params: Promise.resolve({ workspaceId: workspace }) });
const request = (path: string, method: string, body?: unknown, origin = 'http://localhost') => new NextRequest(
  `http://localhost/api/workspaces/${workspace}/${path}`,
  {
    method,
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), Origin: origin },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  },
);
const quota = {
  providerKey: 'crm.provider', adapterKey: 'crm.mcp', maxConcurrentOperations: 3,
  maxReservedCostUsd: 2, maxDailyCostUsd: 10, expectedRevision: null,
};

describe('workspace provider quota and review routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: actor }, allowed: true, mode: 'user' });
    mocks.access.mockResolvedValue({ workspaceId: workspace });
    const builder = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), then: vi.fn() };
    builder.select.mockReturnValue(builder); builder.eq.mockReturnValue(builder); builder.order.mockReturnValue(builder);
    builder.then.mockImplementation((resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve));
    mocks.from.mockReturnValue(builder);
    mocks.rpc.mockResolvedValue({ data: [{ revision: 1 }], error: null });
  });

  it('lists and revision-saves provider ceilings behind owner/admin workspace access', async () => {
    const get = await GET(request('quotas/providers', 'GET'), context());
    expect(get.status).toBe(200);
    const saved = await POST(request('quotas/providers', 'POST', quota), context());
    expect(saved.status).toBe(200);
    expect(mocks.access).toHaveBeenCalledWith(actor, workspace, 'workspace:manage_apps');
    expect(mocks.rpc).toHaveBeenCalledWith('platform_save_provider_quota', expect.objectContaining({
      p_actor_id: actor, p_workspace_id: workspace, p_provider_key: quota.providerKey,
      p_adapter_key: quota.adapterKey, p_expected_revision: null,
    }));
  });

  it('rejects cross-origin quota and review revocation writes before RPC', async () => {
    const foreign = await POST(request('quotas/providers', 'POST', quota, 'https://foreign.example'), context());
    expect(foreign.status).toBe(403);
    const revokeContext = { params: Promise.resolve({ workspaceId: workspace, reviewId: review }) };
    const revoked = await revoke(request(`provider-adapters/${review}/revoke`, 'POST', {}, 'https://foreign.example'), revokeContext);
    expect(revoked.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
