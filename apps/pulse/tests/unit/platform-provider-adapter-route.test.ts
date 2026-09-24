import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn(), rpc: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({ requireSignedInUser: mocks.auth, isAuthResponse: (value: unknown) => value instanceof Response }));
vi.mock('@/lib/platform/access/workspaceAccess.server', () => ({
  requireWorkspaceAccess: mocks.access,
  WorkspaceAccessError: class WorkspaceAccessError extends Error { constructor(public code: string, message: string) { super(message); } },
}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc: mocks.rpc } }));

import { POST } from '@/app/api/workspaces/[workspaceId]/connectors/[connectionId]/provider-adapter/route';

const actor = '11111111-1111-4111-8111-111111111111';
const workspace = '22222222-2222-4222-8222-222222222222';
const routeContext = () => ({ params: Promise.resolve({ workspaceId: workspace, connectionId: 'crm.local' }) });
const body = {
  schemaVersion: 1,
  providerKey: 'crm.provider',
  adapterKey: 'crm.mcp',
  adapterVersion: '1.0.0',
  idempotencyMode: 'lookup_by_operation_id',
  unknownOutcomeRecovery: 'provider_lookup',
  pricingVersion: 1,
  currency: 'USD',
  components: [{ usageKey: 'request_count', rateMicros: 1000, chargeUnits: 1, maxBillableUnits: 1, required: true }],
  maxCostMicrosPerOperation: 1000,
  expectedConnectorRevision: 1,
};
const request = (payload: unknown, origin = 'http://localhost') => new NextRequest(
  `http://localhost/api/workspaces/${workspace}/connectors/crm.local/provider-adapter`,
  { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(payload) },
);

describe('provider adapter review route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: actor }, allowed: true, mode: 'user' });
    mocks.access.mockResolvedValue({ workspaceId: workspace });
    mocks.rpc.mockResolvedValue({ data: [{ id: '33333333-3333-4333-8333-333333333333', contract_hash: 'a'.repeat(64) }], error: null });
  });

  it('requires workspace administration and records reviewer attribution server-side', async () => {
    const response = await POST(request(body), routeContext());
    expect(response.status).toBe(200);
    expect(mocks.access).toHaveBeenCalledWith(actor, workspace, 'workspace:manage_apps');
    expect(mocks.rpc).toHaveBeenCalledWith('platform_register_provider_adapter_review', expect.objectContaining({
      p_actor_id: actor, p_workspace_id: workspace, p_connection_id: 'crm.local', p_expected_connector_revision: 1,
      p_contract: expect.objectContaining({ reviewedBy: actor, reviewedAt: expect.any(String) }),
    }));
  });

  it('rejects cross-origin and invalid contracts before writing', async () => {
    const crossOrigin = await POST(request(body, 'https://foreign.example'), routeContext());
    expect(crossOrigin.status).toBe(403);
    const invalid = await POST(request({ ...body, maxCostMicrosPerOperation: 999 }), routeContext());
    expect(invalid.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
