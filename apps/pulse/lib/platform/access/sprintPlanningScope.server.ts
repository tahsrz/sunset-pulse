import 'server-only';
import { supabaseAdmin } from '@/lib/supabase';

export type OwnerCompatiblePlanningScope = Readonly<{
  jobId: string;
  ownerId: string;
  workspaceId: string;
  planningMode: string | null;
}>;

// Legacy planners accept owner-only inputs. Do not let a team-mapped schedule
// or mixed personal/team data reach those planners until scoped adapters exist.
export async function requireOwnerCompatiblePlanning(jobId: string, leaseToken: string) {
  const { error } = await supabaseAdmin.rpc('platform_require_owner_planning', { p_job_id: jobId, p_lease_token: leaseToken });
  if (error) throw new Error('Sprint planning requires an active, owner-compatible workspace scope.');
}

/**
 * Resolve the identity that a legacy planner is allowed to read under.
 *
 * The scheduler job is authoritative for the owner and schedule. A caller or
 * a domain row must not be allowed to supply a different owner. The existing
 * SQL guard remains the admission fence; this read-side resolver makes the
 * boundary explicit before any backlog or property query is issued.
 */
export async function resolveOwnerCompatiblePlanningScope(jobId: string, leaseToken: string): Promise<OwnerCompatiblePlanningScope> {
  await requireOwnerCompatiblePlanning(jobId, leaseToken);

  const { data: job, error: jobError } = await supabaseAdmin
    .from('workflow_jobs')
    .select('id,user_id,schedule_id,planning_mode')
    .eq('id', jobId)
    .eq('lease_token', leaseToken)
    .eq('workflow_key', 'sprint_planner')
    .maybeSingle();
  if (jobError || !job) throw new Error('Sprint planning job could not be resolved after scope validation.');

  let workspaceId: string | null = null;
  if (job.schedule_id) {
    const { data: scheduleLink, error: scheduleError } = await supabaseAdmin
      .from('platform_scope_links')
      .select('workspace_id,status')
      .eq('resource_type', 'workflow_schedule')
      .eq('resource_id', String(job.schedule_id))
      .maybeSingle();
    if (scheduleError) throw new Error(`Unable to resolve planner workspace: ${scheduleError.message}`);
    if (scheduleLink?.status !== 'mapped' || !scheduleLink.workspace_id) {
      throw new Error('Sprint planning requires an explicitly mapped workspace schedule.');
    }
    workspaceId = String(scheduleLink.workspace_id);
  }

  if (!workspaceId) {
    const { data: personal, error: personalError } = await supabaseAdmin
      .from('platform_workspaces')
      .select('id')
      .eq('created_by', String(job.user_id))
      .eq('kind', 'personal')
      .eq('status', 'active')
      .limit(2);
    if (personalError) throw new Error(`Unable to resolve planner workspace: ${personalError.message}`);
    if (!personal?.length || personal.length > 1) throw new Error('Sprint planning requires one active personal workspace.');
    workspaceId = String(personal[0].id);
  }

  return {
    jobId: String(job.id),
    ownerId: String(job.user_id),
    workspaceId,
    planningMode: job.planning_mode == null ? null : String(job.planning_mode),
  };
}

export async function listMappedPlannerResourceIds(scope: OwnerCompatiblePlanningScope, resourceType: 'sprint_backlog_item' | 'property_shortlist') {
  const { data, error } = await supabaseAdmin
    .from('platform_scope_links')
    .select('resource_id,owner_id')
    .eq('workspace_id', scope.workspaceId)
    .eq('resource_type', resourceType)
    .eq('status', 'mapped');
  if (error) throw new Error(`Unable to load mapped ${resourceType} inputs: ${error.message}`);
  return [...new Set((data || [])
    .filter((row) => !row.owner_id || String(row.owner_id) === scope.ownerId)
    .map((row) => String(row.resource_id))
    .filter(Boolean))];
}

export async function requireOwnerCompatibleMutation(actorId: string, resourceType: 'sprint' | 'assignment' | 'sprint_backlog_item', resourceId: string) {
  const { error } = await supabaseAdmin.rpc('platform_require_owner_compatible_mutation', {
    p_actor_id: actorId,
    p_resource_type: resourceType,
    p_resource_id: resourceId,
  });
  if (error) throw new Error('This record is mapped to a team or unresolved workspace scope. Use the workspace controls.');
}
