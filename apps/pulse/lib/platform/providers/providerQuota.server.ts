import 'server-only';

import { supabaseAdmin } from '@/lib/supabase';
import { requireWorkspaceAccess } from '@/lib/platform/access/workspaceAccess.server';
import { providerQuotaInputSchema } from '@/lib/platform/contracts/providerQuota';
import { PlatformRunError } from '@/lib/platform/workflows/runStore.server';

export async function listProviderQuotas(actorId: string, workspaceId: string) {
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:manage_apps');
  const { data, error } = await supabaseAdmin.from('platform_provider_quota_limits')
    .select('workspace_id,provider_key,adapter_key,max_concurrent_operations,max_reserved_cost_usd,max_daily_cost_usd,revision,updated_by,updated_at')
    .eq('workspace_id', workspaceId).order('provider_key').order('adapter_key');
  if (error) throw new PlatformRunError(error.code);
  return data || [];
}

export async function saveProviderQuota(actorId: string, workspaceId: string, input: unknown) {
  const value = providerQuotaInputSchema.parse(input);
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:manage_apps');
  const { data, error } = await supabaseAdmin.rpc('platform_save_provider_quota', {
    p_actor_id: actorId,
    p_workspace_id: workspaceId,
    p_provider_key: value.providerKey,
    p_adapter_key: value.adapterKey,
    p_max_concurrent_operations: value.maxConcurrentOperations,
    p_max_reserved_cost_usd: value.maxReservedCostUsd,
    p_max_daily_cost_usd: value.maxDailyCostUsd,
    p_expected_revision: value.expectedRevision,
  });
  if (error) throw new PlatformRunError(error.code);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new PlatformRunError('P0002');
  return row;
}

export async function revokeProviderAdapterReview(actorId: string, workspaceId: string, reviewId: string) {
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:manage_apps');
  const { data, error } = await supabaseAdmin.rpc('platform_revoke_provider_adapter_review', {
    p_actor_id: actorId,
    p_workspace_id: workspaceId,
    p_review_id: reviewId,
  });
  if (error) throw new PlatformRunError(error.code);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new PlatformRunError('P0002');
  return row;
}
