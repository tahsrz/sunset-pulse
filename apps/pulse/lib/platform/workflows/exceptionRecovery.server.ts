import 'server-only';

import { z } from 'zod';
import { requireWorkspaceAccess } from '@/lib/platform/access/workspaceAccess.server';
import { supabaseAdmin } from '@/lib/supabase';
import { PlatformRunError } from './runStore.server';

const resolutionSchema = z.object({
  exceptionType: z.enum(['quota_breach', 'review_revoked']),
  resolutionKey: z.string().uuid(),
  reason: z.enum(['investigated', 'provider_lookup_complete', 'manual_review_complete', 'not_retryable']),
}).strict();

const recoveryReviewSchema = z.object({
  reconciliationKey: z.string().uuid(),
  outcome: z.enum(['applied', 'not_applied']),
  evidenceSource: z.enum(['provider_lookup', 'manual_review']),
  evidenceReference: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/),
  evidenceHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

const retryIntentSchema = z.object({
  recoveryReviewId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  retryOperationId: z.string().uuid(),
}).strict();

async function saveRpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.rpc(name, args);
  if (error) throw new PlatformRunError(error.code);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new PlatformRunError('P0002');
  return row;
}

export async function resolveProviderException(actorId: string, workspaceId: string, exceptionId: string, input: unknown) {
  const value = resolutionSchema.parse(input);
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:manage_apps');
  return saveRpc('platform_resolve_provider_exception', {
    p_actor_id: actorId, p_workspace_id: workspaceId, p_exception_type: value.exceptionType,
    p_exception_id: z.string().uuid().parse(exceptionId), p_resolution_key: value.resolutionKey, p_reason: value.reason,
  });
}

export async function recordEffectRecoveryReview(actorId: string, workspaceId: string, receiptId: string, input: unknown) {
  const value = recoveryReviewSchema.parse(input);
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:manage_apps');
  return saveRpc('platform_record_effect_recovery_review', {
    p_actor_id: actorId, p_workspace_id: workspaceId, p_receipt_id: z.string().uuid().parse(receiptId),
    p_reconciliation_key: value.reconciliationKey, p_outcome: value.outcome,
    p_evidence_source: value.evidenceSource, p_evidence_reference: value.evidenceReference,
    p_evidence_hash: value.evidenceHash,
  });
}

export async function createEffectRetryIntent(actorId: string, workspaceId: string, receiptId: string, input: unknown) {
  const value = retryIntentSchema.parse(input);
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:manage_apps');
  return saveRpc('platform_create_effect_retry_intent', {
    p_actor_id: actorId, p_workspace_id: workspaceId, p_receipt_id: z.string().uuid().parse(receiptId),
    p_recovery_review_id: value.recoveryReviewId, p_idempotency_key: value.idempotencyKey,
    p_retry_operation_id: value.retryOperationId,
  });
}
