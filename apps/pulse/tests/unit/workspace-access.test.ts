import { beforeEach, describe, expect, it, vi } from 'vitest';

const fromMock = vi.fn();
const rpcMock = vi.fn();
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: fromMock, rpc: rpcMock } }));

describe('workspace access service', () => {
  beforeEach(() => {
    fromMock.mockReset();
    rpcMock.mockReset();
  });

  it('rejects malformed actor and workspace IDs before database access', async () => {
    const { requireWorkspaceAccess } = await import('@/lib/platform/access/workspaceAccess.server');
    await expect(requireWorkspaceAccess('not-an-actor', crypto.randomUUID(), 'workspace:read')).rejects.toMatchObject({ code: 'INVALID' });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('requires an active membership before loading the workspace', async () => {
    const actorId = crypto.randomUUID();
    const workspaceId = crypto.randomUUID();
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
        }),
      }),
    });
    const { requireWorkspaceAccess } = await import('@/lib/platform/access/workspaceAccess.server');
    await expect(requireWorkspaceAccess(actorId, workspaceId, 'workspace:read')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
