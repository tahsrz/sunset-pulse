import { supabaseAdmin } from '@/lib/supabase';
import { createPropertySprintProposal } from '@/lib/property-sprints/planPropertySprint.server';
import { selectSprintBacklog } from './sprintSelection';
import type { WorkflowExecution, WorkflowJob } from './workflowRegistry.server';

export async function runSprintPlannerWorkflow(job: WorkflowJob): Promise<WorkflowExecution> {
  if (job.planning_mode === 'property_shortlist') {
    const sprintId = await createPropertySprintProposal(job.user_id, job.id, job.scheduled_for);
    return { resultType: 'sprint', resultId: sprintId, resultStatus: 'proposed' };
  }

  const { data: existingSprint, error: existingSprintError } = await supabaseAdmin.from('sprints')
    .select('id')
    .eq('owner_id', job.user_id)
    .eq('source_job_id', job.id)
    .maybeSingle();
  if (existingSprintError) throw new Error(`Unable to inspect scheduled sprint proposal: ${existingSprintError.message}`);
  const sprint = existingSprint || (await supabaseAdmin.from('sprints').insert({
    owner_id: job.user_id,
    name: `Scheduled sprint · ${new Date().toLocaleDateString('en-US')}`,
    goal: 'Review the backlog and select the highest-priority work for this sprint.',
    status: 'proposed',
    source_job_id: job.id,
  }).select('id').single()).data;
  if (!sprint) throw new Error('Unable to create proposed sprint.');

  const { data: backlog, error: backlogError } = await supabaseAdmin.from('sprint_backlog_items')
    .select('id,title,description,priority,estimate_minutes')
    .eq('owner_id', job.user_id)
    .eq('status', 'open')
    .order('priority')
    .order('created_at')
    .limit(100);
  if (backlogError) throw new Error(`Unable to load sprint backlog: ${backlogError.message}`);

  if (backlog?.length) {
    const { data: existingItems } = await supabaseAdmin.from('sprint_items')
      .select('backlog_item_id')
      .eq('owner_id', job.user_id)
      .not('backlog_item_id', 'is', null);
    const existingBacklogIds = new Set((existingItems || []).map((entry) => entry.backlog_item_id));
    const candidates = backlog.filter((entry) => !existingBacklogIds.has(entry.id));
    const selected = selectSprintBacklog(candidates);
    if (selected.length) {
      const { error: itemError } = await supabaseAdmin.from('sprint_items').insert(selected.map((entry) => ({
        backlog_item_id: entry.id,
        title: entry.title,
        description: entry.description,
        priority: entry.priority,
        estimate_minutes: entry.estimate_minutes,
        sprint_id: sprint.id,
        owner_id: job.user_id,
      })));
      if (itemError) throw new Error(`Unable to create sprint items: ${itemError.message}`);
    }
  }

  return { resultType: 'sprint', resultId: sprint.id, resultStatus: 'proposed' };
}
