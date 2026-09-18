import 'server-only';

import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { requireWorkspaceAccess } from './workspaceAccess.server';

export const domainResourceTypeSchema = z.enum([
  'property_shortlist',
  'sprint',
  'assignment',
  'licensed_workflow_run',
  'vibe_revision',
  'scan',
]);
export type DomainResourceType = z.infer<typeof domainResourceTypeSchema>;

export type DomainScopeReference = Readonly<{
  resourceType: DomainResourceType;
  resourceId: string;
  ownerId: string;
  workspaceId: string;
  resourceRevision: number | null;
}>;

export class DomainScopeError extends Error {
  constructor(
    public readonly code: 'INVALID' | 'NOT_FOUND' | 'FORBIDDEN' | 'UNMAPPED' | 'AMBIGUOUS' | 'UNSUPPORTED',
    message: string,
  ) {
    super(message);
    this.name = 'DomainScopeError';
  }
}

const uuidSchema = z.string().uuid();
const resourceIdSchema = z.string().trim().min(1).max(240);

type OwnerScopedRow = Readonly<{ owner_id: string | null; revision?: number | null }>;
type WorkspaceRow = Readonly<{ id: string; created_by: string; kind: 'personal' | 'team'; status: 'active' | 'archived' }>;

function parseInput(actorId: string, resourceId: string) {
  const actor = uuidSchema.safeParse(actorId);
  const resource = resourceIdSchema.safeParse(resourceId);
  if (!actor.success || !resource.success) throw new DomainScopeError('INVALID', 'A valid actor and resource ID are required.');
  return { actorId: actor.data, resourceId: resource.data };
}

async function resolveWorkspaceForOwner(ownerId: string, actorId: string) {
  if (ownerId !== actorId) throw new DomainScopeError('FORBIDDEN', 'The resource does not belong to this actor.');
  const { data, error } = await supabaseAdmin
    .from('platform_workspaces')
    .select('id,created_by,kind,status')
    .eq('created_by', ownerId)
    .eq('kind', 'personal')
    .eq('status', 'active')
    .limit(2);
  if (error) throw new Error(`Unable to resolve personal workspace: ${error.message}`);
  const workspaces = (data || []) as WorkspaceRow[];
  if (!workspaces.length) throw new DomainScopeError('UNMAPPED', 'Owner has no active personal workspace.');
  if (workspaces.length > 1) throw new DomainScopeError('AMBIGUOUS', 'Owner has multiple active personal workspaces.');
  return workspaces[0].id;
}

async function resolveSupabaseOwnerScopedResource(
  actorId: string,
  resourceId: string,
  resourceType: DomainResourceType,
  table: string,
  select = 'owner_id,revision',
): Promise<DomainScopeReference> {
  const input = parseInput(actorId, resourceId);
  const { data, error } = await supabaseAdmin.from(table).select(select).eq('id', input.resourceId).maybeSingle();
  if (error) throw new Error(`Unable to resolve ${resourceType} scope: ${error.message}`);
  if (!data) throw new DomainScopeError('NOT_FOUND', `${resourceType} resource was not found.`);
  const row = data as unknown as OwnerScopedRow;
  if (!row.owner_id) throw new DomainScopeError('UNMAPPED', `${resourceType} resource has no owner ID.`);
  const workspaceId = await resolveWorkspaceForOwner(row.owner_id, input.actorId);
  return {
    resourceType,
    resourceId: input.resourceId,
    ownerId: row.owner_id,
    workspaceId,
    resourceRevision: row.revision == null ? null : Number(row.revision),
  };
}

export function resolvePropertyShortlistScope(actorId: string, propertyId: string) {
  return resolveSupabaseOwnerScopedResource(actorId, propertyId, 'property_shortlist', 'property_shortlist_entries');
}

export function resolveSprintScope(actorId: string, sprintId: string) {
  return resolveSupabaseOwnerScopedResource(actorId, sprintId, 'sprint', 'sprints');
}

export function resolveAssignmentScope(actorId: string, assignmentId: string) {
  return resolveSupabaseOwnerScopedResource(actorId, assignmentId, 'assignment', 'agent_assignments');
}

export function resolveLicensedWorkflowRunScope(actorId: string, runId: string) {
  return resolveSupabaseOwnerScopedResource(actorId, runId, 'licensed_workflow_run', 'licensed_workflow_runs', 'owner_id:user_id,revision');
}

export async function resolveWorkspaceMappedResourceScope(
  actorId: string,
  workspaceId: string,
  resourceType: DomainResourceType,
  resourceId: string,
): Promise<DomainScopeReference> {
  const input = parseInput(actorId, resourceId);
  const workspace = await requireWorkspaceAccess(input.actorId, workspaceId, 'workspace:read');
  const { data, error } = await supabaseAdmin
    .from('platform_scope_links')
    .select('resource_id,owner_id,workspace_id,status,source_revision')
    .eq('workspace_id', workspace.workspaceId)
    .eq('resource_type', resourceType)
    .eq('resource_id', input.resourceId)
    .maybeSingle();
  if (error) throw new Error(`Unable to resolve mapped ${resourceType} scope: ${error.message}`);
  if (!data) throw new DomainScopeError('UNMAPPED', `${resourceType} is not mapped into this workspace.`);
  if (data.status !== 'mapped' || !data.owner_id) throw new DomainScopeError('UNMAPPED', `${resourceType} mapping is not ready.`);
  return {
    resourceType,
    resourceId: String(data.resource_id),
    ownerId: String(data.owner_id),
    workspaceId: workspace.workspaceId,
    resourceRevision: data.source_revision == null ? null : Number(data.source_revision),
  };
}

export function resolveVibeRevisionScope(_actorId: string, _revisionId: string): Promise<DomainScopeReference> {
  return Promise.reject(new DomainScopeError('UNSUPPORTED', 'Vibe revision storage has no authoritative workspace adapter yet.'));
}

export function resolveScanScope(_actorId: string, _scanId: string): Promise<DomainScopeReference> {
  return Promise.reject(new DomainScopeError('UNSUPPORTED', 'Scan storage remains on its independent Mongo-backed track.'));
}
