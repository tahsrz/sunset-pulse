import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), create: vi.fn(), list: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({ requireSignedInUser: mocks.auth, isAuthResponse: (value: unknown) => value instanceof Response }));
vi.mock('@/lib/platform/access/workspaceAccess.server', () => ({
  WorkspaceAccessError: class WorkspaceAccessError extends Error {
    constructor(public readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'INVALID', message: string) { super(message); }
  },
  createWorkspace: mocks.create,
  listAccessibleWorkspaces: mocks.list,
}));

import { GET, POST } from '@/app/api/workspaces/route';

const actor = '11111111-1111-4111-8111-111111111111';
const createRequest = (body: string, origin = 'http://localhost', contentType = 'application/json') => new NextRequest('http://localhost/api/workspaces', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': contentType }, body,
});

describe('workspace collection routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: actor } });
    mocks.create.mockResolvedValue({ workspaceId: '22222222-2222-4222-8222-222222222222', membershipId: 'membership-1', reused: false });
    mocks.list.mockResolvedValue([]);
  });

  it('lists only the signed-in actor accessible workspaces privately', async () => {
    const response = await GET(new NextRequest('http://localhost/api/workspaces'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mocks.list).toHaveBeenCalledWith(actor);
  });

  it('rejects cross-origin creation before invoking workspace creation', async () => {
    const response = await POST(createRequest(JSON.stringify({ kind: 'team', name: 'Pilot' }), 'https://untrusted.example'));
    expect(response.status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('bounds and validates JSON before creating a team workspace', async () => {
    const oversized = await POST(createRequest(' '.repeat(131073)));
    expect(oversized.status).toBe(413);
    const unsupported = await POST(createRequest('{"kind":"team","name":"Pilot"}', 'http://localhost', 'text/plain'));
    expect(unsupported.status).toBe(415);
    expect(mocks.create).not.toHaveBeenCalled();

    const valid = await POST(createRequest(JSON.stringify({ kind: 'team', name: 'Pilot' })));
    expect(valid.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(actor, { kind: 'team', name: 'Pilot' });
  });

  it('returns authentication responses without querying the workspace store', async () => {
    mocks.auth.mockResolvedValue(new Response(null, { status: 401 }));
    expect((await GET(new NextRequest('http://localhost/api/workspaces'))).status).toBe(401);
    expect(mocks.list).not.toHaveBeenCalled();
  });
});
