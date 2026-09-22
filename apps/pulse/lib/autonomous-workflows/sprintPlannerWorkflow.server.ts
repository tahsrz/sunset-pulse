import { supabaseAdmin } from '@/lib/supabase';
import { createPropertySprintProposal } from '@/lib/property-sprints/planPropertySprint.server';
import { selectSprintBacklog } from './sprintSelection';
import type { WorkflowExecution, WorkflowJob } from './workflowRegistry.server';
import { listMappedPlannerResourceIds, resolveOwnerCompatiblePlanningScope } from '@/lib/platform/access/sprintPlanningScope.server';

export async function runSprintPlannerWorkflow(job: WorkflowJob): Promise<WorkflowExecution> {
  const scope = await resolveOwnerCompatiblePlanningScope(job.id, job.lease_token);
  const eventPlanningMode = job.trigger_kind === 'event' && job.payload?.planningMode === 'property_shortlist'
    ? 'property_shortlist'
    : null;
  const planningMode = eventPlanningMode || job.planning_mode;
  if (planningMode === 'property_shortlist') {
    const sprintId = await createPropertySprintProposal(scope.ownerId, scope.workspaceId, job.id, job.scheduled_for, job.lease_token);
    return { kind: 'complete', resultType: 'sprint', resultId: sprintId, resultStatus: 'proposed' };
  }

  const backlogIds = await listMappedPlannerResourceIds(scope, 'sprint_backlog_item');
  const { data: backlog, error: backlogError } = await supabaseAdmin.from('sprint_backlog_items')
    .select('id,title,description,priority,estimate_minutes')
    .eq('owner_id', scope.ownerId)
    .in('id', backlogIds.length ? backlogIds : ['00000000-0000-4000-8000-000000000000'])
    .eq('status', 'open')
    .order('priority')
    .order('created_at')
    .limit(100);
  if (backlogError) throw new Error(`Unable to load sprint backlog: ${backlogError.message}`);

  if (backlog?.length) {
    const { data: existingItems } = await supabaseAdmin.from('sprint_items')
      .select('backlog_item_id')
      .eq('owner_id', scope.ownerId)
      .not('backlog_item_id', 'is', null);
    const existingBacklogIds = new Set((existingItems || []).map((entry) => entry.backlog_item_id));
    const candidates = backlog.filter((entry) => !existingBacklogIds.has(entry.id));
    const selected = selectSprintBacklog(candidates);
    if (selected.length) {
      const items = selected.map((entry) => ({
        backlog_item_id: entry.id,
        title: entry.title,
        description: entry.description,
        priority: entry.priority,
        estimate_minutes: entry.estimate_minutes,
      }));
      const { data: persisted, error: persistError } = await supabaseAdmin.rpc('platform_persist_scoped_sprint_proposal', {
        p_job_id: job.id,
        p_workspace_id: scope.workspaceId,
        p_occurrence: job.scheduled_for,
        p_name: `Scheduled sprint · ${new Date(job.scheduled_for).toLocaleDateString('en-US')}`,
        p_goal: 'Review the backlog and select the highest-priority work for this sprint.',
        p_items: items,
      });
      if (persistError) throw new Error(`Unable to persist scheduled sprint proposal: ${persistError.message}`);
      const sprintId = (Array.isArray(persisted) ? persisted[0] : persisted)?.sprint_id;
      if (!sprintId) throw new Error('Scheduled sprint proposal did not return an ID.');
      return { kind: 'complete', resultType: 'sprint', resultId: sprintId, resultStatus: 'proposed' };
    }
  }

  const { data: persisted, error: persistError } = await supabaseAdmin.rpc('platform_persist_scoped_sprint_proposal', {
    p_job_id: job.id,
    p_workspace_id: scope.workspaceId,
    p_occurrence: job.scheduled_for,
    p_name: `Scheduled sprint · ${new Date(job.scheduled_for).toLocaleDateString('en-US')}`,
    p_goal: 'Review the backlog and select the highest-priority work for this sprint.',
    p_items: [],
  });
  if (persistError) throw new Error(`Unable to persist scheduled sprint proposal: ${persistError.message}`);
  const sprintId = (Array.isArray(persisted) ? persisted[0] : persisted)?.sprint_id;
  if (!sprintId) throw new Error('Scheduled sprint proposal did not return an ID.');
  return { kind: 'complete', resultType: 'sprint', resultId: sprintId, resultStatus: 'proposed' };
}
