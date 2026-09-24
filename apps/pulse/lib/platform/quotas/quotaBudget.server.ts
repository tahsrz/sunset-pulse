import 'server-only';

import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { requireWorkspaceAccess } from '@/lib/platform/access/workspaceAccess.server';
import { quotaBudgetInputSchema } from '@/lib/platform/contracts/quotaBudget';
import { PlatformRunError } from '@/lib/platform/workflows/runStore.server';
import { enqueueCapabilityReservationReconciliation } from '@/lib/autonomous-workflows/schedulerEvents.server';

const reconciliationRequestSchema = z.object({ eventKey: z.string().trim().min(1).max(240) }).strict();

export async function getQuotaBudget(actorId: string, workspaceId: string) {
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:manage_apps');
  const { data, error } = await supabaseAdmin.from('platform_quota_limits')
    .select('workspace_id,max_concurrent_operations,max_steps_per_run,max_estimated_cost_usd,max_tokens_per_run,max_run_estimated_cost_usd,max_run_duration_seconds,revision,updated_by,updated_at')
    .eq('workspace_id', workspaceId).maybeSingle();
  if (error) throw new PlatformRunError(error.code);
  return data;
}

export async function saveQuotaBudget(actorId: string, workspaceId: string, input: unknown) {
  const value = quotaBudgetInputSchema.parse(input);
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:manage_apps');
  const { data, error } = await supabaseAdmin.rpc('platform_save_quota_budget', {
    p_actor_id: actorId,
    p_workspace_id: workspaceId,
    p_max_concurrent_operations: value.maxConcurrentOperations,
    p_max_steps_per_run: value.maxStepsPerRun,
    p_max_estimated_cost_usd: value.maxEstimatedCostUsd,
    p_max_tokens_per_run: value.maxTokensPerRun,
    p_max_run_estimated_cost_usd: value.maxRunEstimatedCostUsd,
    p_max_run_duration_seconds: value.maxRunDurationSeconds,
    p_expected_revision: value.expectedRevision,
  });
  if (error) throw new PlatformRunError(error.code);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new PlatformRunError('P0002');
  return row;
}

export async function scheduleQuotaReconciliation(actorId: string, workspaceId: string, input: unknown) {
  const value = reconciliationRequestSchema.parse(input);
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:manage_apps');
  const job = await enqueueCapabilityReservationReconciliation({
    userId: actorId, workspaceId, eventKey: value.eventKey, batchLimit: 100,
  });
  return { id: job.id, workflowKey: job.workflow_key, eventKey: job.event_key, status: job.status, batchLimit: 100 };
}
