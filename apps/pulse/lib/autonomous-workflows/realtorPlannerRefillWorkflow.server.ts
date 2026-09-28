import 'server-only';

import { supabaseAdmin } from '@/lib/supabase';
import { expandOccurrences, reminderInstant } from '@/lib/realtor-workspace/recurrence';
import { dueSpecSchema } from '@/lib/realtor-workspace/contracts';
import type { WorkflowExecution, WorkflowJob } from './workflowRegistry.server';

const ITEM_BATCH_SIZE = 25;
const REFILL_DAYS = 90;

function localDate(timeZone: string, at = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(at);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function addDays(value: string, days: number) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function laterDate(first: string, second: string) {
  return first > second ? first : second;
}

/**
 * Fills one bounded slice of recurrence definitions through the next 90 local
 * calendar days. The RPC advances item cursors and, on the last slice, commits
 * the scheduler result and completes the lease atomically.
 */
export async function runRealtorPlannerRefill(job: WorkflowJob): Promise<WorkflowExecution> {
  if (job.trigger_kind !== 'scheduled' || job.workflow_key !== 'realtor_planner') {
    throw new Error('Realtor planner refill requires its scheduled workflow job.');
  }

  const { data: preferences, error: preferencesError } = await supabaseAdmin.from('realtor_preferences')
    .select('workspace_id,time_zone')
    .eq('user_id', job.user_id)
    .maybeSingle();
  if (preferencesError) throw new Error(`Unable to read realtor planner settings: ${preferencesError.message}`);
  if (!preferences) {
    return commitBatch(job, addDays(localDate('America/Chicago'), REFILL_DAYS), []);
  }

  const today = localDate(preferences.time_zone);
  const throughDate = addDays(today, REFILL_DAYS);
  const { data: rawItems, error: itemError } = await supabaseAdmin.from('realtor_planner_items')
    .select('id,workspace_id,revision,due_spec,refill_coverage_through')
    .eq('user_id', job.user_id)
    .eq('workspace_id', preferences.workspace_id)
    .eq('status', 'active')
    .lte('due_spec->>anchorDate', throughDate)
    .or(`refill_coverage_through.is.null,refill_coverage_through.lt.${throughDate}`)
    .order('refill_coverage_through', { ascending: true, nullsFirst: true })
    .order('id', { ascending: true })
    .limit(ITEM_BATCH_SIZE + 1);
  if (itemError) throw new Error(`Unable to load realtor planner refill items: ${itemError.message}`);

  const candidates = (rawItems || []).slice(0, ITEM_BATCH_SIZE).map((item) => {
    const due = dueSpecSchema.parse(item.due_spec);
    const fromDate = item.refill_coverage_through
      ? addDays(item.refill_coverage_through, 1)
      : laterDate(due.anchorDate, addDays(today, -45));
    const expanded = fromDate <= throughDate
      ? expandOccurrences(due, fromDate, throughDate, 200)
      : { occurrences: [], hasMore: false, nextDate: null };
    if (expanded.hasMore) throw new Error('Planner refill exceeded its per-series occurrence bound.');
    return {
      itemId: item.id,
      workspaceId: item.workspace_id,
      itemRevision: item.revision,
      fromDate,
      throughDate,
      occurrences: expanded.occurrences.map((occurrence) => ({
        originalDate: occurrence.occurrenceKeyDate,
        effectiveDate: occurrence.effectiveDate,
        reminders: due.reminderOffsetsDays.map((offsetDays) => ({
          offsetDays,
          scheduledAt: reminderInstant(occurrence.effectiveDate, offsetDays, due.localTime, due.timeZone),
        })),
      })),
    };
  });

  return commitBatch(job, throughDate, candidates);
}

async function commitBatch(job: WorkflowJob, throughDate: string, candidates: unknown[]): Promise<WorkflowExecution> {
  const { data, error } = await supabaseAdmin.rpc('realtor_commit_planner_refill_batch', {
    p_job_id: job.id,
    p_lease_token: job.lease_token,
    p_coverage_through: throughDate,
    p_candidates: candidates,
  });
  if (error) throw new Error(`Unable to commit realtor planner refill: ${error.message}`);
  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.committed) {
    if (result?.result_status === 'stale') {
      return { kind: 'defer', nextPollAt: new Date(Date.now() + 60_000).toISOString(), reason: 'planner_refill_lease_stale' };
    }
    return { kind: 'defer', nextPollAt: new Date(Date.now() + 60_000).toISOString(), reason: 'planner_refill_more_items' };
  }
  return { kind: 'committed', resultId: job.id, resultStatus: result.result_status || 'completed' };
}
