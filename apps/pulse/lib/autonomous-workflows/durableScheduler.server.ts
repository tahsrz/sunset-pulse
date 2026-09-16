import { supabaseAdmin } from '@/lib/supabase';
import { cadenceMilliseconds, nextOccurrenceAfter, normalizeScheduleSpec } from './schedulerPolicy';
import { getWorkflowHandler, type WorkflowJob } from './workflowRegistry.server';

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
      const execution = await getWorkflowHandler(job.workflow_key)(job as WorkflowJob);
      if (execution.kind === 'defer') {
        const nextPollAtMs = Date.parse(execution.nextPollAt);
        if (!Number.isFinite(nextPollAtMs) || nextPollAtMs <= Date.now()) {
          throw new Error('Workflow returned an invalid deferred poll time.');
        }
        const { data: deferred, error: deferError } = await supabaseAdmin.rpc('defer_workflow_job', {
          p_job_id: job.id,
          p_lease_token: job.lease_token,
          p_next_poll_at: execution.nextPollAt,
          p_reason: execution.reason || null,
        });
        if (deferError) throw new Error(`Workflow deferral could not be saved: ${deferError.message}`);
        const resolution = Array.isArray(deferred) ? deferred[0] : deferred;
        results.push({ jobId: job.id, status: resolution?.status || 'stale' });
        continue;
      }
      const { data: completed, error: completeError } = await supabaseAdmin.rpc('complete_workflow_job_with_result', {
        p_job_id: job.id,
        p_lease_token: job.lease_token,
        p_result_type: execution.resultType,
        p_result_id: execution.resultId,
        p_run_id: execution.runId || null,
      });
      if (completeError) throw new Error(`Workflow completed but job receipt could not be saved: ${completeError.message}`);
      if (!completed) {
        results.push({ jobId: job.id, status: 'stale' });
        continue;
      }
      results.push({ jobId: job.id, status: execution.resultStatus, runId: execution.resultId });
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Unknown workflow failure.';
      const { data: resolved, error: failError } = await supabaseAdmin.rpc('resolve_workflow_failure', {
        p_job_id: job.id,
        p_lease_token: job.lease_token,
        p_error: message,
      });
      if (failError) {
        results.push({ jobId: job.id, status: 'error', error: `${message}; failure receipt could not be saved: ${failError.message}` });
      } else {
        const resolution = Array.isArray(resolved) ? resolved[0] : resolved;
        const status = resolution?.status || 'stale';
        results.push({ jobId: job.id, status, error: status === 'stale' ? undefined : message });
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
