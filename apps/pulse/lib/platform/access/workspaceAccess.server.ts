import 'server-only';

import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import {
  roleAllowsAction,
  workspaceActionSchema,
  workspaceCreateInputSchema,
  workspaceIdSchema,
  type ActorId,
  type WorkspaceAction,
  type WorkspaceContext,
  type WorkspaceId,
  type WorkspaceRole,
} from '@/lib/platform/contracts/identity';

const actorIdSchema = z.string().uuid();

export class WorkspaceAccessError extends Error {
  constructor(public readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'INVALID', message: string) {
    super(message);
    this.name = 'WorkspaceAccessError';
  }
}

type MembershipRow = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  status: 'active' | 'revoked';
};

type WorkspaceRow = {
  id: string;
  kind: 'personal' | 'team';
  name: string;
  status: 'active' | 'archived';
  revision: number;
};

function parseActorId(actorId: string): ActorId {
  const parsed = actorIdSchema.safeParse(actorId);
  if (!parsed.success) throw new WorkspaceAccessError('INVALID', 'A valid signed-in actor is required.');
  return parsed.data as ActorId;
}

function parseWorkspaceId(workspaceId: string): WorkspaceId {
  const parsed = workspaceIdSchema.safeParse(workspaceId);
  if (!parsed.success) throw new WorkspaceAccessError('INVALID', 'A valid workspace is required.');
  return parsed.data as WorkspaceId;
}

export async function listAccessibleWorkspaces(actorId: string) {
  const actor = parseActorId(actorId);
  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from('platform_memberships')
    .select('workspace_id,user_id,role,status')
    .eq('user_id', actor)
    .eq('status', 'active')
    .order('created_at', { ascending: true });
  if (membershipError) throw new Error(`Unable to load workspace memberships: ${membershipError.message}`);

  const ids = [...new Set((memberships || []).map((row) => row.workspace_id))];
  if (!ids.length) return [];
  const { data: workspaces, error: workspaceError } = await supabaseAdmin
    .from('platform_workspaces')
    .select('id,kind,name,status,revision')
    .in('id', ids)
    .eq('status', 'active');
  if (workspaceError) throw new Error(`Unable to load workspaces: ${workspaceError.message}`);

  const byId = new Map((workspaces || []).map((workspace) => [workspace.id, workspace as WorkspaceRow]));
  return (memberships || []).flatMap((membership) => {
    const workspace = byId.get(membership.workspace_id);
    return workspace ? [{ workspace, membership: membership as MembershipRow }] : [];
  });
}

export async function requireWorkspaceAccess(actorId: string, workspaceId: string, action: WorkspaceAction): Promise<WorkspaceContext> {
  const actor = parseActorId(actorId);
  const workspace = parseWorkspaceId(workspaceId);
  const parsedAction = workspaceActionSchema.safeParse(action);
  if (!parsedAction.success) throw new WorkspaceAccessError('INVALID', 'Unsupported workspace action.');

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('platform_memberships')
    .select('workspace_id,user_id,role,status')
    .eq('workspace_id', workspace)
    .eq('user_id', actor)
    .eq('status', 'active')
    .maybeSingle();
  if (membershipError) throw new Error(`Unable to verify workspace access: ${membershipError.message}`);
  if (!membership) throw new WorkspaceAccessError('NOT_FOUND', 'Workspace not found.');
  if (!roleAllowsAction(membership.role as WorkspaceRole, parsedAction.data)) {
    throw new WorkspaceAccessError('FORBIDDEN', 'You do not have permission for this workspace action.');
  }

  const { data: workspaceRow, error: workspaceError } = await supabaseAdmin
    .from('platform_workspaces')
    .select('id,kind,name,status,revision')
    .eq('id', workspace)
    .eq('status', 'active')
    .maybeSingle();
  if (workspaceError) throw new Error(`Unable to load workspace: ${workspaceError.message}`);
  if (!workspaceRow) throw new WorkspaceAccessError('NOT_FOUND', 'Workspace not found.');

  return {
    workspaceId: workspace,
    actorId: actor,
    role: membership.role as WorkspaceRole,
    workspace: {
      kind: workspaceRow.kind,
      name: workspaceRow.name,
      status: workspaceRow.status,
      revision: workspaceRow.revision,
    },
  };
}

export async function createWorkspace(actorId: string, input: unknown) {
  const actor = parseActorId(actorId);
  const parsed = workspaceCreateInputSchema.safeParse(input);
  if (!parsed.success) throw new WorkspaceAccessError('INVALID', 'Workspace name and kind are required.');
  const workspaceId = crypto.randomUUID();
  const { data, error } = await supabaseAdmin.rpc('platform_create_workspace_with_owner', {
    p_actor_id: actor,
    p_workspace_id: workspaceId,
    p_kind: parsed.data.kind,
    p_name: parsed.data.name,
  });
  if (error) throw new Error(`Unable to create workspace: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.workspace_id || !row?.membership_id) throw new Error('Workspace creation did not return an owner membership.');
  return { workspaceId: row.workspace_id as WorkspaceId, membershipId: row.membership_id as string, reused: Boolean(row.reused) };
}
