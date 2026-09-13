import { supabaseAdmin } from '@/lib/supabase';
import { runHotlistEmailForUser } from '@/app/api/admin/automations/hotlist-email/route';
import { advanceSchedule } from './schedulerPolicy';
import { selectSprintBacklog } from './sprintSelection';

export async function enqueueDueWorkflowJobs(limit = 25) {
  const now = new Date().toISOString();
  const { data: schedules, error } = await supabaseAdmin.from('workflow_schedules')
    .select('id,user_id,workflow_key,next_run_at,cadence,time_zone,local_hour,local_minute,local_weekday,revision')
    .eq('enabled', true).lte('next_run_at', now).order('next_run_at').limit(limit);
  if (error) throw new Error(`Unable to load due workflow schedules: ${error.message}`);
  let queued = 0;
  for (const schedule of schedules || []) {
    const scheduledFor = schedule.next_run_at;
    const { error: jobError } = await supabaseAdmin.from('workflow_jobs').upsert({
      schedule_id: schedule.id, user_id: schedule.user_id, workflow_key: schedule.workflow_key,
      scheduled_for: scheduledFor, status: 'queued',
    }, { onConflict: 'schedule_id,scheduled_for', ignoreDuplicates: true });
    if (jobError) throw new Error(`Unable to enqueue workflow job: ${jobError.message}`);
    let nextRun = advanceSchedule(scheduledFor, schedule.cadence === 'weekly' || schedule.cadence === 'daily' ? schedule.cadence : 'hourly', schedule.time_zone || 'UTC', schedule.local_hour, schedule.local_minute, schedule.local_weekday || 1);
    let guard = 0;
    while (Date.parse(nextRun) <= Date.now() && guard < 100) {
      nextRun = advanceSchedule(nextRun, schedule.cadence === 'weekly' || schedule.cadence === 'daily' ? schedule.cadence : 'hourly', schedule.time_zone || 'UTC', schedule.local_hour, schedule.local_minute, schedule.local_weekday || 1);
      guard += 1;
    }
    const { data: advanced, error: advanceError } = await supabaseAdmin.rpc('advance_workflow_schedule', { p_schedule_id: schedule.id, p_expected_at: scheduledFor, p_expected_revision: schedule.revision || 1, p_next_at: nextRun });
    if (advanceError) throw new Error(`Unable to advance workflow schedule: ${advanceError.message}`);
    if (!advanced) continue;
    queued += 1;
  }
  return { schedules: schedules?.length || 0, queued };
}

export async function processQueuedWorkflowJobs(limit = 10) {
  await recoverExpiredWorkflowJobs();
  const { data: jobs, error } = await supabaseAdmin.rpc('claim_workflow_jobs', { p_limit: limit, p_lease_seconds: 300 });
  if (error) throw new Error(`Unable to load queued workflow jobs: ${error.message}`);

  const results: Array<{ jobId: string; status: string; runId?: string; error?: string }> = [];
  for (const job of jobs || []) {
    const { error: clearError } = await supabaseAdmin.from('workflow_jobs').update({ error: null }).eq('id', job.id).eq('lease_token', job.lease_token);
    if (clearError) throw new Error(`Unable to initialize workflow job: ${clearError.message}`);
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
      } else throw new Error(`Unsupported workflow key: ${job.workflow_key}`);
      const { error: completeError } = await supabaseAdmin.from('workflow_jobs').update({ status: 'completed', run_id: job.workflow_key === 'hotlist_email' ? runId : null, result_id: runId, lease_until: null, lease_token: null }).eq('id', job.id).eq('lease_token', job.lease_token);
      if (completeError) throw new Error(`Workflow completed but job receipt could not be saved: ${completeError.message}`);
      const { error: resultError } = await supabaseAdmin.from('workflow_results').upsert({ job_id: job.id, workflow_key: job.workflow_key, result_type: job.workflow_key === 'hotlist_email' ? 'licensed_workflow_run' : 'sprint', result_id: runId }, { onConflict: 'job_id' });
      if (resultError) throw new Error(`Workflow completed but generic result could not be saved: ${resultError.message}`);
      results.push({ jobId: job.id, status: resultStatus, runId });
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Unknown workflow failure.';
      await supabaseAdmin.from('workflow_jobs').update({ status: 'failed', lease_until: null, lease_token: null, error: message }).eq('id', job.id).eq('lease_token', job.lease_token);
      results.push({ jobId: job.id, status: 'failed', error: message });
    }
  }
  return { processed: results.length, results };
}

export async function recoverExpiredWorkflowJobs() {
  const { data, error } = await supabaseAdmin.rpc('recover_workflow_leases');
  if (error) throw new Error(`Unable to recover expired workflow leases: ${error.message}`);
  return Number(data || 0);
}
