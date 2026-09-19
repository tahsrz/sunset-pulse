import 'server-only';

import { supabaseAdmin } from '@/lib/supabase';
import { requireWorkspaceAccess } from '@/lib/platform/access/workspaceAccess.server';

export async function listSprintsForWorkspace(actorId: string, workspaceId: string) {
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:read');

  const { data: links, error: linkError } = await supabaseAdmin
    .from('platform_scope_links')
    .select('resource_id,resource_type')
    .eq('workspace_id', workspaceId)
    .in('resource_type', ['sprint', 'workflow_schedule', 'sprint_backlog_item'])
    .eq('status', 'mapped');
  if (linkError) throw new Error(`Unable to load workspace sprint scope: ${linkError.message}`);

  const resourceIds = (resourceType: string) => [...new Set((links || []).filter((link) => link.resource_type === resourceType).map((link) => link.resource_id))];
  const sprintIds = resourceIds('sprint');
  const scheduleIds = resourceIds('workflow_schedule');
  const linkedBacklogIds = resourceIds('sprint_backlog_item');

  const [{ data: sprints, error: sprintError }, { data: items, error: itemError }] = await Promise.all([
    sprintIds.length ? supabaseAdmin.from('sprints').select('*').in('id', sprintIds).order('created_at', { ascending: false }).limit(50) : Promise.resolve({ data: [], error: null }),
    sprintIds.length ? supabaseAdmin.from('sprint_items').select('*').in('sprint_id', sprintIds).order('priority').limit(500) : Promise.resolve({ data: [], error: null }),
  ]);
  if (sprintError) throw new Error(`Unable to load workspace sprints: ${sprintError.message}`);
  if (itemError) throw new Error(`Unable to load workspace sprint items: ${itemError.message}`);

  const itemIds = (items || []).map((item) => item.id);
  const backlogIds = [...new Set([...linkedBacklogIds, ...(items || []).map((item) => item.backlog_item_id).filter(Boolean)])];
  const [{ data: assignments, error: assignmentError }, { data: backlog, error: backlogError }, { data: schedules, error: scheduleError }] = await Promise.all([
    itemIds.length
      ? supabaseAdmin.from('agent_assignments').select('*').in('sprint_item_id', itemIds).order('created_at', { ascending: false }).limit(500)
      : Promise.resolve({ data: [], error: null }),
    backlogIds.length
      ? supabaseAdmin.from('sprint_backlog_items').select('*').in('id', backlogIds).order('priority').limit(500)
      : Promise.resolve({ data: [], error: null }),
    scheduleIds.length
      ? supabaseAdmin.from('workflow_schedules').select('id,workflow_key,planning_mode,enabled,cadence,time_zone,local_hour,local_minute,local_weekday,next_run_at,revision').in('id', scheduleIds).eq('workflow_key', 'sprint_planner')
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (assignmentError) throw new Error(`Unable to load workspace assignments: ${assignmentError.message}`);
  if (backlogError) throw new Error(`Unable to load workspace sprint backlog: ${backlogError.message}`);
  if (scheduleError) throw new Error(`Unable to load workspace sprint schedules: ${scheduleError.message}`);

  return { sprints: sprints || [], items: items || [], assignments: assignments || [], backlog: backlog || [], schedules: schedules || [] };
}
