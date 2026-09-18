import { supabaseAdmin } from '@/lib/supabase';
import { buildPropertyBacklog } from './buildPropertyBacklog';
import { listPropertyNotes, listShortlistEntries } from './shortlist.server';

export async function createPropertySprintProposal(ownerId: string, jobId: string, occurrenceAt: string, leaseToken: string) {
  const properties = await listShortlistEntries(ownerId);
  const planningProperties = await Promise.all(properties.map(async (property) => ({ ...property, collaborationNotes: (await listPropertyNotes(ownerId, property.id)).map((note) => `${note.authorType}: ${note.body}`) })));
  const { data: existingTasks, error: taskError } = await supabaseAdmin.from('sprint_backlog_items').select('dedupe_key,status').eq('owner_id', ownerId).not('dedupe_key', 'is', null);
  if (taskError) throw new Error(`Unable to inspect property sprint tasks: ${taskError.message}`);
  const normalizedExistingTasks = (existingTasks || []).map((task) => ({ dedupeKey: task.dedupe_key, status: task.status }));
  const plan = buildPropertyBacklog({ properties: planningProperties, existingTasks: normalizedExistingTasks, occurrenceAt });
  const items = plan.tasks.map((task) => ({
    property_id: task.propertyId, property_revision: task.propertyRevision, dedupe_key: task.dedupeKey,
    title: task.title, description: task.description, priority: task.priority, estimate_minutes: task.estimatedMinutes,
  }));
  const { data, error } = await supabaseAdmin.rpc('platform_persist_property_sprint_proposal', {
    p_job_id: jobId, p_owner_id: ownerId, p_lease_token: leaseToken, p_occurrence: occurrenceAt,
    p_name: `Keller / Westlake property sprint · ${new Date(occurrenceAt).toLocaleDateString('en-US')}`,
    p_goal: 'Resolve property facts and prepare reviewed buyer follow-up for the Keller / Westlake shortlist.',
    p_backlog_items: items.map((item) => ({ ...item, source_type: 'property_shortlist', source_id: item.property_id, property_task_kind: plan.tasks.find((task) => task.dedupeKey === item.dedupe_key)?.taskKind, input_revision: item.property_revision })),
    p_items: items,
  });
  if (error) throw new Error(`Unable to persist property sprint proposal: ${error.message}`);
  const sprintId = (Array.isArray(data) ? data[0] : data)?.sprint_id;
  if (!sprintId) throw new Error('Property sprint proposal did not return an ID.');
  return sprintId;
}
