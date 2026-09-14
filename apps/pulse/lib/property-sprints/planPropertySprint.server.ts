import { supabaseAdmin } from '@/lib/supabase';
import { buildPropertyBacklog } from './buildPropertyBacklog';
import { listPropertyNotes, listShortlistEntries } from './shortlist.server';
import { selectSprintBacklog } from '@/lib/autonomous-workflows/sprintSelection';

export async function createPropertySprintProposal(ownerId: string, jobId: string, occurrenceAt: string) {
  const { data: existing, error: existingError } = await supabaseAdmin.from('sprints').select('id').eq('owner_id', ownerId).eq('source_job_id', jobId).maybeSingle();
  if (existingError) throw new Error(`Unable to inspect property sprint proposal: ${existingError.message}`);
  if (existing) return existing.id;
  const properties = await listShortlistEntries(ownerId);
  const planningProperties = await Promise.all(properties.map(async (property) => ({ ...property, collaborationNotes: (await listPropertyNotes(ownerId, property.id)).map((note) => `${note.authorType}: ${note.body}`) })));
  const { data: existingTasks, error: taskError } = await supabaseAdmin.from('sprint_backlog_items').select('dedupe_key,status').eq('owner_id', ownerId).not('dedupe_key', 'is', null);
  if (taskError) throw new Error(`Unable to inspect property sprint tasks: ${taskError.message}`);
  const plan = buildPropertyBacklog({ properties: planningProperties, existingTasks: existingTasks || [], occurrenceAt });
  if (plan.tasks.length) {
    const { error } = await supabaseAdmin.from('sprint_backlog_items').insert(plan.tasks.map((task) => ({ owner_id: ownerId, title: task.title, description: task.description, priority: task.priority, estimate_minutes: task.estimatedMinutes, source_type: task.sourceType, source_id: task.propertyId, property_id: task.propertyId, property_task_kind: task.taskKind, input_revision: task.propertyRevision, dedupe_key: task.dedupeKey })));
    if (error && !error.message.toLowerCase().includes('duplicate')) throw new Error(`Unable to persist property sprint tasks: ${error.message}`);
  }
  const { data: sprint, error: sprintError } = await supabaseAdmin.from('sprints').insert({ owner_id: ownerId, name: `Keller / Westlake property sprint · ${new Date(occurrenceAt).toLocaleDateString('en-US')}`, goal: 'Resolve property facts and prepare reviewed buyer follow-up for the Keller / Westlake shortlist.', status: 'proposed', source_job_id: jobId }).select('id').single();
  if (sprintError) throw new Error(`Unable to create property sprint proposal: ${sprintError.message}`);
  const { data: backlog, error: backlogError } = await supabaseAdmin.from('sprint_backlog_items').select('id,title,description,priority,estimate_minutes,property_id,input_revision,dedupe_key').eq('owner_id', ownerId).eq('status', 'open').eq('source_type', 'property_shortlist').order('priority').order('created_at').limit(100);
  if (backlogError) throw new Error(`Unable to load property sprint tasks: ${backlogError.message}`);
  const { error: itemError } = await supabaseAdmin.from('sprint_items').insert(selectSprintBacklog(backlog || []).map((entry) => ({ backlog_item_id: entry.id, property_id: entry.property_id, property_revision: entry.input_revision, title: entry.title, description: entry.description, priority: entry.priority, estimate_minutes: entry.estimate_minutes, sprint_id: sprint.id, owner_id: ownerId })));
  if (itemError) throw new Error(`Unable to create property sprint items: ${itemError.message}`);
  return sprint.id;
}
