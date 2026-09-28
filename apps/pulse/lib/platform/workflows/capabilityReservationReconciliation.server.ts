import 'server-only';

import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { WorkspaceAccessError, requireWorkspaceAccess } from '@/lib/platform/access/workspaceAccess.server';
import type { WorkflowExecution, WorkflowJob } from '@/lib/autonomous-workflows/workflowRegistry.server';

const payloadSchema = z.object({ workspaceId: z.string().uuid(), batchLimit: z.number().int().min(1).max(100) }).strict();

export async function runCapabilityReservationReconciliation(job: WorkflowJob): Promise<WorkflowExecution> {
  if (job.trigger_kind !== 'event' || !job.payload) throw new Error('Reconciliation requires a validated event job.');
  const parsed = payloadSchema.safeParse(job.payload);
  if (!parsed.success) throw new Error('Invalid capability reconciliation event payload.');
  try {
    await requireWorkspaceAccess(job.user_id, parsed.data.workspaceId, 'workspace:manage_apps');
  } catch (error) {
    if (error instanceof WorkspaceAccessError && ['FORBIDDEN', 'NOT_FOUND'].includes(error.code)) {
      return { kind: 'complete', resultType: 'quota_reconciliation', resultId: job.id, resultStatus: 'authorization_revoked' };
    }
    throw error;
  }
  const { data, error } = await supabaseAdmin.rpc('platform_reconcile_capability_reservations', {
    p_workspace_id: parsed.data.workspaceId,
    p_limit: parsed.data.batchLimit,
  });
  if (error) throw new Error(`Capability reservation reconciliation failed (${error.code}).`);
  const count = Number(data);
  if (!Number.isInteger(count) || count < 0 || count > parsed.data.batchLimit) throw new Error('Reconciliation returned an invalid result.');
  return { kind: 'complete', resultType: 'quota_reconciliation', resultId: job.id, resultStatus: `expired:${count}` };
}
