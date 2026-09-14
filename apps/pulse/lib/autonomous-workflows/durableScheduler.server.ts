import { supabaseAdmin } from '@/lib/supabase';
import { runHotlistEmailForUser } from '@/app/api/admin/automations/hotlist-email/route';
import { createPropertySprintProposal } from '@/lib/property-sprints/planPropertySprint.server';
import { cadenceMilliseconds, nextOccurrenceAfter, normalizeScheduleSpec } from './schedulerPolicy';
import { selectSprintBacklog } from './sprintSelection';

export async function enqueueDueWorkflowJobs(limit = 25) {
  const now = new Date().toISOString();
  const { data: schedules, error } = await supabaseAdmin.from('workflow_schedules')
    .select('id,user_id,workflow_key,planning_mode,next_run_at,cadence,time_zone,local_hour,local_minute,local_weekday,revision')
    .eq('enabled', true).lte('next_run_at', now).order('next_run_at').limit(limit);
  if (error) throw new Error(`Unable to load due workflow schedules: ${error.message}`);
  let queued = 0;
  for (const schedule of schedules || []) {
    const scheduledFor = schedule.next_run_at;
    const cadence = schedule.cadence === 'weekly' || schedule.cadence === 'daily' ? schedule.cadence : 'hourly';
    const scheduleSpec = normalizeScheduleSpec({
      cadence,
      timeZone: schedule.time_zone || 'UTC',
      localHour: schedule.local_hour ?? 8,
      localMinute: schedule.local_minute ?? 0,
      localWeekday: schedule.local_weekday ?? 1,
    });
    const nowMs = Date.parse(now);
    const scheduledForMs = Date.parse(scheduledFor);
    let nextRun: string;
    if (cadence === 'hourly') {
      const hourlyMs = cadenceMilliseconds('hourly');
      const intervals = Math.floor(Math.max(0, nowMs - scheduledForMs) / hourlyMs) + 1;
      nextRun = new Date(scheduledForMs + intervals * hourlyMs).toISOString();
    } else {
      nextRun = nextOccurrenceAfter(new Date(nowMs), scheduleSpec);
    }
    const { data: dispatched, error: dispatchError } = await supabaseAdmin.rpc('dispatch_due_workflow_schedule', {
      p_schedule_id: schedule.id,
      p_expected_at: scheduledFor,
      p_expected_revision: schedule.revision || 1,
      p_next_at: nextRun,
      p_now: now,
    });
    if (dispatchError) throw new Error(`Unable to dispatch workflow schedule: ${dispatchError.message}`);
    const dispatch = Array.isArray(dispatched) ? dispatched[0] : dispatched;
    if (!dispatch) continue;
    queued += Number(dispatch.inserted_count || 0);
  }
  return { schedules: schedules?.length || 0, queued };
}

export async function processQueuedWorkflowJobs(limit = 10) {
  await recoverExpiredWorkflowJobs();
  const results: Array<{ jobId: string; status: string; runId?: string; error?: string }> = [];
  const requestedLimit = Number.isFinite(limit) ? Math.trunc(limit) : 0;
  const maxJobs = Math.min(Math.max(requestedLimit, 0), 10);

  // Claim one job at a time so a function deadline leaves at most one leased
  // job to recover, rather than a batch of workers that can all expire together.
  for (let index = 0; index < maxJobs; index += 1) {
    const { data: jobs, error } = await supabaseAdmin.rpc('claim_workflow_jobs', { p_limit: 1, p_lease_seconds: 300 });
    if (error) throw new Error(`Unable to load queued workflow jobs: ${error.message}`);
    const job = jobs?.[0];
    if (!job) break;

    try {
      let runId: string | undefined;
      let resultStatus = 'drafted';
      if (job.workflow_key === 'hotlist_email') {
        // The handler still enforces the persisted profile policy; this flag only
        // allows an explicitly opted-in schedule to auto-send.
        const result = await runHotlistEmailForUser({ userId: job.user_id, auditName: 'Scheduled licensed workflow', confirmAutoSend: true });
        runId = result.run.id;
        resultStatus = result.reused ? 'unchanged' : 'drafted';
      } else if (job.workflow_key === 'sprint_planner') {
        if (job.planning_mode === 'property_shortlist') {
          runId = await createPropertySprintProposal(job.user_id, job.id, job.scheduled_for);
          resultStatus = 'proposed';
        } else {
        const { data: sprint, error: sprintError } = await supabaseAdmin.from('sprints').insert({ owner_id: job.user_id, name: `Scheduled sprint · ${new Date().toLocaleDateString('en-US')}`, goal: 'Review the backlog and select the highest-priority work for this sprint.', status: 'proposed', source_job_id: job.id }).select('id').single();
        if (sprintError) throw new Error(`Unable to create proposed sprint: ${sprintError.message}`);
        const { data: backlog, error: backlogError } = await supabaseAdmin.from('sprint_backlog_items').select('id,title,description,priority,estimate_minutes').eq('owner_id', job.user_id).eq('status', 'open').order('priority').order('created_at').limit(100);
        if (backlogError) throw new Error(`Unable to load sprint backlog: ${backlogError.message}`);
        if (backlog?.length) {
          const { data: existingItems } = await supabaseAdmin.from('sprint_items').select('backlog_item_id').eq('owner_id', job.user_id).not('backlog_item_id', 'is', null);
          const existingBacklogIds = new Set((existingItems || []).map((entry) => entry.backlog_item_id));
          const candidates = backlog.filter((entry) => !existingBacklogIds.has(entry.id));
          const { error: itemError } = await supabaseAdmin.from('sprint_items').insert(selectSprintBacklog(candidates).map((entry) => ({ backlog_item_id: entry.id, title: entry.title, description: entry.description, priority: entry.priority, estimate_minutes: entry.estimate_minutes, sprint_id: sprint.id, owner_id: job.user_id })));
          if (itemError) throw new Error(`Unable to create sprint items: ${itemError.message}`);
        }
        runId = sprint.id;
        resultStatus = 'proposed';
        }
      } else throw new Error(`Unsupported workflow key: ${job.workflow_key}`);
      if (!runId) throw new Error('Workflow completed without a durable result identifier.');
      const { data: completed, error: completeError } = await supabaseAdmin.rpc('complete_workflow_job_with_result', {
        p_job_id: job.id,
        p_lease_token: job.lease_token,
        p_result_type: job.workflow_key === 'hotlist_email' ? 'licensed_workflow_run' : 'sprint',
        p_result_id: runId,
        p_run_id: job.workflow_key === 'hotlist_email' ? runId : null,
      });
      if (completeError) throw new Error(`Workflow completed but job receipt could not be saved: ${completeError.message}`);
      if (!completed) {
        results.push({ jobId: job.id, status: 'stale' });
        continue;
      }
      results.push({ jobId: job.id, status: resultStatus, runId });
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Unknown workflow failure.';
      const { data: failed, error: failError } = await supabaseAdmin.rpc('fail_workflow_job', {
        p_job_id: job.id,
        p_lease_token: job.lease_token,
        p_error: message,
      });
      if (failError) {
        results.push({ jobId: job.id, status: 'error', error: `${message}; failure receipt could not be saved: ${failError.message}` });
      } else {
        results.push({ jobId: job.id, status: failed ? 'failed' : 'stale', error: failed ? message : undefined });
      }
    }
  }
  return { processed: results.length, results };
}

export async function recoverExpiredWorkflowJobs() {
  const { data, error } = await supabaseAdmin.rpc('recover_workflow_leases');
  if (error) throw new Error(`Unable to recover expired workflow leases: ${error.message}`);
  return Number(data || 0);
}
