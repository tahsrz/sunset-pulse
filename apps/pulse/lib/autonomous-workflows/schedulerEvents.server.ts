import 'server-only';

import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';

const eventInputSchema = z.object({
  userId: z.string().uuid(),
  workflowKey: z.enum(['hotlist_email', 'sprint_planner']),
  eventKey: z.string().trim().min(1).max(240),
  payload: z.record(z.string(), z.unknown()),
  payloadVersion: z.number().int().positive().default(1),
  scheduledFor: z.string().datetime({ offset: true }).optional(),
});

export type WorkflowEventInput = z.input<typeof eventInputSchema>;

const sprintPlannerEventSchema = z.object({
  userId: z.string().uuid(),
  eventKey: z.string().trim().min(1).max(240),
  planningMode: z.enum(['manual_backlog', 'property_shortlist']).default('manual_backlog'),
  source: z.enum(['owner_request', 'property_scan', 'system']).default('system'),
  scheduledFor: z.string().datetime({ offset: true }).optional(),
});

export async function enqueueWorkflowEvent(input: WorkflowEventInput) {
  const parsed = eventInputSchema.parse(input);
  const { data, error } = await supabaseAdmin.rpc('enqueue_workflow_event', {
    p_user_id: parsed.userId,
    p_workflow_key: parsed.workflowKey,
    p_event_key: parsed.eventKey,
    p_payload: parsed.payload,
    p_payload_version: parsed.payloadVersion,
    p_scheduled_for: parsed.scheduledFor ?? null,
  });

  if (error) throw new Error(`Unable to enqueue workflow event: ${error.message}`);
  const job = Array.isArray(data) ? data[0] : data;
  if (!job) throw new Error('Workflow event enqueue did not return a job.');
  return job;
}

export async function enqueueSprintPlannerEvent(input: z.input<typeof sprintPlannerEventSchema>) {
  const parsed = sprintPlannerEventSchema.parse(input);
  return enqueueWorkflowEvent({
    userId: parsed.userId,
    workflowKey: 'sprint_planner',
    eventKey: parsed.eventKey,
    payload: { planningMode: parsed.planningMode, source: parsed.source },
    payloadVersion: 1,
    scheduledFor: parsed.scheduledFor,
  });
}
