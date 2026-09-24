import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { requireWorkspaceAccess } from '@/lib/platform/access/workspaceAccess.server';
import { supabaseAdmin } from '@/lib/supabase';
import { PlatformRunError } from '@/lib/platform/workflows/runStore.server';

const idSchema = z.string().uuid();
const invitationInputSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  role: z.enum(['admin', 'member', 'reviewer', 'viewer']),
}).strict();

async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.rpc(name, args);
  if (error) throw new PlatformRunError(error.code);
  return data;
}

function withoutTokenHash(row: Record<string, unknown>) {
  const safe = { ...row };
  delete safe.token_hash;
  return safe;
}

export async function listWorkspaceInvitations(actorId: string, workspaceId: string) {
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:manage_members');
  const data = await rpc('platform_list_workspace_invitations', { p_actor_id: actorId, p_workspace_id: idSchema.parse(workspaceId) });
  return Array.isArray(data) ? data.map(withoutTokenHash) : [];
}

export async function listWorkspaceMembers(actorId: string, workspaceId: string) {
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:manage_members');
  return rpc('platform_list_workspace_members', { p_actor_id: actorId, p_workspace_id: idSchema.parse(workspaceId) });
}

export async function createWorkspaceInvitation(actorId: string, workspaceId: string, input: unknown) {
  const value = invitationInputSchema.parse(input);
  const access = await requireWorkspaceAccess(actorId, workspaceId, 'workspace:manage_members');
  if (value.role === 'admin' && access.role !== 'owner') throw new PlatformRunError('42501');
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const data = await rpc('platform_create_workspace_invitation', {
    p_actor_id: actorId,
    p_workspace_id: idSchema.parse(workspaceId),
    p_email: value.email,
    p_role: value.role,
    p_token_hash: tokenHash,
    p_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new PlatformRunError('P0002');
  return { invitation: withoutTokenHash(row), token, delivery: 'not_sent' as const };
}

export async function revokeWorkspaceInvitation(actorId: string, workspaceId: string, invitationId: string) {
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:manage_members');
  const data = await rpc('platform_revoke_workspace_invitation', {
    p_actor_id: actorId, p_workspace_id: idSchema.parse(workspaceId), p_invitation_id: idSchema.parse(invitationId),
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new PlatformRunError('P0002');
  return withoutTokenHash(row);
}

export async function revokeWorkspaceMembership(actorId: string, workspaceId: string, membershipId: string) {
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:manage_members');
  const data = await rpc('platform_revoke_workspace_membership', {
    p_actor_id: actorId, p_workspace_id: idSchema.parse(workspaceId), p_membership_id: idSchema.parse(membershipId),
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new PlatformRunError('P0002');
  return row;
}

export async function acceptWorkspaceInvitation(actorId: string, token: string) {
  const parsedToken = z.string().min(40).max(64).regex(/^[A-Za-z0-9_-]+$/).parse(token);
  const tokenHash = createHash('sha256').update(parsedToken).digest('hex');
  const data = await rpc('platform_accept_workspace_invitation', { p_actor_id: idSchema.parse(actorId), p_token_hash: tokenHash });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new PlatformRunError('P0002');
  return row;
}
