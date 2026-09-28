import 'server-only';

import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import type { WorkflowExecution, WorkflowJob } from './workflowRegistry.server';

const payloadSchema = z.object({
  workspaceId: z.string().uuid(),
  occurrenceId: z.string().uuid(),
  occurrenceRevision: z.number().int().positive(),
  reminderId: z.string().uuid(),
  reminderRevision: z.number().int().positive(),
}).strict();

/** Fenced in-app reminder delivery; it never contacts an external provider. */
export async function runRealtorReminder(job: WorkflowJob): Promise<WorkflowExecution> {
  if (job.trigger_kind !== 'event') throw new Error('Realtor reminders require a durable event job.');
  const payload = payloadSchema.parse(job.payload || {});
  const { data, error } = await supabaseAdmin.rpc('realtor_commit_reminder_job', {
    p_job_id: job.id,
    p_lease_token: job.lease_token,
  });
  if (error) throw new Error(`Unable to commit realtor reminder: ${error.message}`);
  const committed = Array.isArray(data) ? data[0] : data;
  if (!committed?.committed) return { kind: 'defer', nextPollAt: new Date(Date.now() + 60_000).toISOString(), reason: 'reminder_lease_stale' };
  return {
    kind: 'committed',
    resultId: payload.reminderId,
    resultStatus: committed.result_status || 'completed',
  };
}
