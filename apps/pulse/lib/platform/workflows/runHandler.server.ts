import 'server-only';

import { supabaseAdmin } from '@/lib/supabase';
import type { WorkflowExecution, WorkflowJob } from '@/lib/autonomous-workflows/workflowRegistry.server';

export async function runPlatformWorkflow(job: WorkflowJob): Promise<WorkflowExecution> {
  const { data, error } = await supabaseAdmin.rpc('platform_tick_run', { p_job_id: job.id, p_lease_token: job.lease_token });
  if (error) throw new Error('Unable to advance platform workflow.');
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new Error('Platform transition did not return a receipt.');
  // The run change, checkpoint and workflow_results receipt committed together.
  return { kind: 'committed', resultId: result.run_id, resultStatus: result.run_status };
}
