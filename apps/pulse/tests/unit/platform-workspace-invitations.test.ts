import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ access: vi.fn(), rpc: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/platform/access/workspaceAccess.server', () => ({ requireWorkspaceAccess: mocks.access }));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc: mocks.rpc } }));

import {
  acceptWorkspaceInvitation,
  createWorkspaceInvitation,
  listWorkspaceInvitations,
  revokeWorkspaceMembership,
} from '@/lib/platform/access/workspaceInvitations.server';

const actor = '11111111-1111-4111-8111-111111111111';
const workspace = '22222222-2222-4222-8222-222222222222';

describe('workspace invitation and membership lifecycle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.access.mockResolvedValue({ workspaceId: workspace, role: 'owner' });
    mocks.rpc.mockResolvedValue({ data: [{ id: '33333333-3333-4333-8333-333333333333', token_hash: 'a'.repeat(64) }], error: null });
  });

  it('creates a bounded invite, returns raw token once, and never returns its persisted hash', async () => {
    const result = await createWorkspaceInvitation(actor, workspace, { email: 'Invitee@Example.test', role: 'member' });
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{40,64}$/);
    expect(result.delivery).toBe('not_sent');
    expect(result.invitation).not.toHaveProperty('token_hash');
    expect(mocks.access).toHaveBeenCalledWith(actor, workspace, 'workspace:manage_members');
    expect(mocks.rpc).toHaveBeenCalledWith('platform_create_workspace_invitation', expect.objectContaining({
      p_actor_id: actor, p_workspace_id: workspace, p_email: 'invitee@example.test', p_role: 'member',
      p_token_hash: expect.stringMatching(/^[a-f0-9]{64}$/), p_expires_at: expect.any(String),
    }));
  });

  it('only the owner may grant admin role and validates invitation input before storage', async () => {
    mocks.access.mockResolvedValue({ workspaceId: workspace, role: 'admin' });
    await expect(createWorkspaceInvitation(actor, workspace, { email: 'a@example.test', role: 'admin' })).rejects.toMatchObject({ code: '42501' });
    await expect(createWorkspaceInvitation(actor, workspace, { email: 'a@example.test', role: 'owner' })).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('lists invitations behind membership-management authorization and strips stored hashes', async () => {
    const result = await listWorkspaceInvitations(actor, workspace);
    expect(mocks.access).toHaveBeenCalledWith(actor, workspace, 'workspace:manage_members');
    expect(mocks.rpc).toHaveBeenCalledWith('platform_list_workspace_invitations', { p_actor_id: actor, p_workspace_id: workspace });
    expect(result).toEqual([{ id: '33333333-3333-4333-8333-333333333333' }]);
  });

  it('hashes acceptance tokens and scopes membership revocation to the workspace', async () => {
    const rawToken = 'A'.repeat(43);
    await acceptWorkspaceInvitation(actor, rawToken);
    const args = mocks.rpc.mock.calls[0][1];
    expect(args.p_actor_id).toBe(actor);
    expect(args.p_token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(args.p_token_hash).not.toBe(rawToken);
    mocks.rpc.mockClear();
    await revokeWorkspaceMembership(actor, workspace, '33333333-3333-4333-8333-333333333333');
    expect(mocks.rpc).toHaveBeenCalledWith('platform_revoke_workspace_membership', {
      p_actor_id: actor, p_workspace_id: workspace, p_membership_id: '33333333-3333-4333-8333-333333333333',
    });
  });
});
