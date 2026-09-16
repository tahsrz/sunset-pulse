import { runHotlistEmailForUser } from './hotlistEmailWorkflow.server';
import { runSprintPlannerWorkflow } from './sprintPlannerWorkflow.server';

export type WorkflowJob = {
  id: string;
  user_id: string;
  workflow_key: string;
  trigger_kind?: 'scheduled' | 'event';
  event_key?: string | null;
  payload?: Record<string, unknown>;
  payload_version?: number;
  planning_mode?: string | null;
  scheduled_for: string;
  lease_token: string;
};

export type WorkflowExecution = {
  kind: 'complete';
  resultType: 'licensed_workflow_run' | 'sprint';
  resultId: string;
  resultStatus: string;
  runId?: string | null;
} | {
  kind: 'defer';
  nextPollAt: string;
  reason?: string;
};

type WorkflowHandler = (job: WorkflowJob) => Promise<WorkflowExecution>;

const workflowHandlers: Readonly<Record<string, WorkflowHandler>> = Object.freeze({
  hotlist_email: runHotlistEmailWorkflow,
  sprint_planner: runSprintPlannerWorkflow,
});

export function getWorkflowHandler(workflowKey: string): WorkflowHandler {
  const handler = workflowHandlers[workflowKey];
  if (!handler) throw new Error(`Unsupported workflow key: ${workflowKey}`);
  return handler;
}

async function runHotlistEmailWorkflow(job: WorkflowJob): Promise<WorkflowExecution> {
  const result = await runHotlistEmailForUser({
    userId: job.user_id,
    auditName: 'Scheduled licensed workflow',
    confirmAutoSend: true,
    retryFailed: true,
  });
  return {
    kind: 'complete',
    resultType: 'licensed_workflow_run',
    resultId: result.run.id,
    runId: result.run.id,
    resultStatus: result.reused ? 'unchanged' : result.autoSent ? 'sent' : 'drafted',
  };
}
