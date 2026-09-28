import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({ requireSignedInUser: mocks.auth, isAuthResponse: (value: unknown) => value instanceof Response }));
vi.mock('@/lib/platform/access/workspaceAccess.server', () => ({
  requireWorkspaceAccess: mocks.access,
  WorkspaceAccessError: class WorkspaceAccessError extends Error { constructor(public code: string, message: string) { super(message); } },
}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc: mocks.rpc, from: mocks.from } }));

import { GET, PUT } from '@/app/api/workspaces/[workspaceId]/layout/route';

const actor = '11111111-1111-4111-8111-111111111111';
const workspace = '22222222-2222-4222-8222-222222222222';
const foreignWorkspace = '44444444-4444-4444-8444-444444444444';
const context = () => ({ params: Promise.resolve({ workspaceId: workspace }) });
const layout = {
  schemaVersion: 1,
  workspaceId: workspace,
  viewport: { x: 0, y: 0, zoom: 1 },
  windows: [{
    window: { id: '33333333-3333-4333-8333-333333333333', kind: 'checkpoint_inbox', target: { workspaceId: workspace } },
    x: 0, y: 0, width: 640, height: 480, zIndex: 1,
  }],
};
const request = (method: 'GET' | 'PUT', body?: unknown, origin = 'http://localhost') => new NextRequest(
  `http://localhost/api/workspaces/${workspace}/layout`,
  { method, headers: { Origin: origin, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) },
);

describe('private workspace canvas-layout routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: actor }, allowed: true, mode: 'user' });
    mocks.access.mockResolvedValue({ workspaceId: workspace, role: 'member' });
    mocks.from.mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) });
    mocks.rpc.mockResolvedValue({ data: [{ workspace_id: workspace, user_id: actor, schema_version: 1, layout, revision: 1, updated_at: '2026-09-24T12:00:00Z' }], error: null });
  });

  it('reads only the signed-in user’s row and sends private no-store headers', async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: {
      workspace_id: workspace, user_id: actor, schema_version: 1, layout, revision: 4, updated_at: '2026-09-24T12:00:00Z',
    }, error: null }) };
    mocks.from.mockReturnValue(query);
    const response = await GET(request('GET'), context());
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(query.eq).toHaveBeenCalledWith('workspace_id', workspace);
    expect(query.eq).toHaveBeenCalledWith('user_id', actor);
    expect((await response.json()).result.revision).toBe(4);
  });

  it('saves a validated layout through the revision-checked service RPC', async () => {
    const response = await PUT(request('PUT', { layout, expectedRevision: null }), context());
    expect(response.status).toBe(200);
    expect(mocks.access).toHaveBeenCalledWith(actor, workspace, 'workspace:read');
    expect(mocks.rpc).toHaveBeenCalledWith('platform_save_user_layout', {
      p_actor_id: actor, p_workspace_id: workspace, p_layout: layout, p_expected_revision: null,
    });
  });

  it('rejects invalid or foreign-workspace layouts before persistence', async () => {
    const response = await PUT(request('PUT', { layout: { ...layout, workspaceId: foreignWorkspace }, expectedRevision: null }), context());
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('returns a revision conflict before writing when another request already advanced the private layout', async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { revision: 9 }, error: null }) };
    mocks.from.mockReturnValue(query);
    const stale = await PUT(request('PUT', { layout, expectedRevision: 8 }), context());
    expect(stale.status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith('workspace_id', workspace);
    expect(query.eq).toHaveBeenCalledWith('user_id', actor);
  });

  it('requires authentication, same-origin writes, and conflict-safe revisions', async () => {
    const foreignOrigin = await PUT(request('PUT', { layout, expectedRevision: null }, 'https://foreign.example'), context());
    expect(foreignOrigin.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();

    mocks.rpc.mockResolvedValue({ data: null, error: { code: '40001', message: 'sensitive database text' } });
    const stale = await PUT(request('PUT', { layout, expectedRevision: 8 }), context());
    expect(stale.status).toBe(409);
    expect(await stale.text()).not.toContain('sensitive');

    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'Canvas layout revision conflict' } });
    const normalizedStale = await PUT(request('PUT', { layout, expectedRevision: 8 }), context());
    expect(normalizedStale.status).toBe(409);
    expect(await normalizedStale.text()).not.toContain('Canvas layout revision conflict');

    mocks.auth.mockResolvedValue(new Response(null, { status: 401 }));
    expect((await GET(request('GET'), context())).status).toBe(401);
  });
});
