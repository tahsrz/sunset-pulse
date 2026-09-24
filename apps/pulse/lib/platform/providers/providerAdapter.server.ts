import 'server-only';

import { supabaseAdmin } from '@/lib/supabase';
import { requireWorkspaceAccess } from '@/lib/platform/access/workspaceAccess.server';
import { providerAdapterRegistrationSchema } from '@/lib/platform/contracts/providerAdapter';
import { PlatformRunError } from '@/lib/platform/workflows/runStore.server';

export async function registerReviewedProviderAdapter(
  actorId: string,
  workspaceId: string,
  connectionId: string,
  input: unknown,
) {
  const value = providerAdapterRegistrationSchema.parse(input);
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:manage_apps');
  const contract = {
    schemaVersion: value.schemaVersion,
    providerKey: value.providerKey,
    adapterKey: value.adapterKey,
    adapterVersion: value.adapterVersion,
    idempotencyMode: value.idempotencyMode,
    unknownOutcomeRecovery: value.unknownOutcomeRecovery,
    pricingVersion: value.pricingVersion,
    currency: value.currency,
    components: value.components,
    maxCostMicrosPerOperation: value.maxCostMicrosPerOperation,
    reviewedBy: actorId,
    reviewedAt: new Date().toISOString(),
  };
  const { data, error } = await supabaseAdmin.rpc('platform_register_provider_adapter_review', {
    p_actor_id: actorId,
    p_workspace_id: workspaceId,
    p_connection_id: connectionId,
    p_contract: contract,
    p_expected_connector_revision: value.expectedConnectorRevision,
  });
  if (error) throw new PlatformRunError(error.code);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new PlatformRunError('P0002');
  return row;
}
