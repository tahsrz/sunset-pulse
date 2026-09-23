import 'server-only';

import { z } from 'zod';
import { requireWorkspaceAccess } from '@/lib/platform/access/workspaceAccess.server';
import { enqueueConnectorHealthCheck } from '@/lib/autonomous-workflows/schedulerEvents.server';

const connectorHealthScheduleInputSchema = z.object({
  connectorId: z.string().uuid(),
  eventKey: z.string().trim().min(1).max(240),
  scheduledFor: z.string().datetime({ offset: true }).optional(),
}).strict();

export async function scheduleConnectorHealthCheck(actorId: string, workspaceId: string, input: unknown) {
  const value = connectorHealthScheduleInputSchema.parse(input);
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:manage_apps');
  const job = await enqueueConnectorHealthCheck({
    userId: actorId,
    eventKey: value.eventKey,
    workspaceId,
    connectorId: value.connectorId,
    scheduledFor: value.scheduledFor,
  });
  return {
    id: job.id,
    workflowKey: job.workflow_key,
    eventKey: job.event_key,
    scheduledFor: job.scheduled_for,
    status: job.status,
  };
}
