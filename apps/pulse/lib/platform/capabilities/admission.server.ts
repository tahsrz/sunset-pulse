import 'server-only';

import { supabaseAdmin } from '@/lib/supabase';
import { requireWorkspaceAccess } from '@/lib/platform/access/workspaceAccess.server';
import { connectorDefinitionSchema, connectorSchemaSnapshotSchema } from '@/lib/platform/contracts/connector';
import { capabilityAdmissionInputSchema, validateCapabilityPayload } from '@/lib/platform/contracts/capabilityAdmission';
import { providerAdapterContractSchema } from '@/lib/platform/contracts/providerAdapter';
import { PlatformRunError } from '@/lib/platform/workflows/runStore.server';

export async function admitCapabilityOperation(actorId: string, workspaceId: string, input: unknown) {
  const value = capabilityAdmissionInputSchema.parse(input);
  await requireWorkspaceAccess(actorId, workspaceId, 'workflow:run');

  const { data: connector, error: connectorError } = await supabaseAdmin.from('platform_connector_definitions')
    .select('id,connection_id,status,definition,definition_hash,provider_review_id,provider_contract_hash')
    .eq('workspace_id', workspaceId).eq('connection_id', value.connectionId).maybeSingle();
  if (connectorError) throw new PlatformRunError(connectorError.code);
  if (!connector || connector.status !== 'reviewed') throw new PlatformRunError('P0002');
  connectorDefinitionSchema.parse(connector.definition);

  let providerReview: unknown = null;
  if (connector.provider_review_id) {
    const { data: review, error: reviewError } = await supabaseAdmin.from('platform_provider_adapter_reviews')
      .select('id,connector_id,provider_key,adapter_key,adapter_version,contract,contract_hash,reviewed_by,reviewed_at,status')
      .eq('workspace_id', workspaceId).eq('id', connector.provider_review_id).maybeSingle();
    if (reviewError) throw new PlatformRunError(reviewError.code);
    if (!review || review.status !== 'reviewed' || review.connector_id !== connector.id || review.contract_hash !== connector.provider_contract_hash) {
      throw new PlatformRunError('55000');
    }
    const contract = providerAdapterContractSchema.parse(review.contract);
    if (contract.providerKey !== review.provider_key || contract.adapterKey !== review.adapter_key
      || contract.adapterVersion !== review.adapter_version || contract.reviewedBy !== review.reviewed_by) {
      throw new PlatformRunError('55000');
    }
    providerReview = { id: review.id, contractHash: review.contract_hash, contract };
  }

  const { data: snapshot, error: snapshotError } = await supabaseAdmin.from('platform_connector_schema_snapshots')
    .select('id,tool,operation,direction,schema,schema_hash')
    .eq('workspace_id', workspaceId).eq('connector_id', connector.id).eq('tool', value.tool)
    .eq('operation', value.operation).eq('direction', 'input').maybeSingle();
  if (snapshotError) throw new PlatformRunError(snapshotError.code);
  if (!snapshot || snapshot.schema_hash !== value.inputSchemaHash) throw new PlatformRunError('P0002');
  connectorSchemaSnapshotSchema.parse({ schemaVersion: 1, connectionId: connector.connection_id, tool: snapshot.tool,
    operation: snapshot.operation, direction: snapshot.direction, schemaHash: snapshot.schema_hash, schema: snapshot.schema });
  const payload = validateCapabilityPayload(snapshot.schema, value.payload);

  const { data, error } = await supabaseAdmin.rpc('platform_admit_capability_operation', {
    p_workspace_id: workspaceId, p_app_install_id: value.appInstallId, p_run_id: value.runId,
    p_operation_id: value.operationId, p_connection_id: value.connectionId, p_tool: value.tool,
    p_operation: value.operation, p_input_schema_hash: value.inputSchemaHash,
    p_output_schema_hash: value.outputSchemaHash, p_step_units: value.stepUnits,
    p_estimated_cost_usd: value.estimatedCostUsd, p_estimated_tokens: value.estimatedTokens,
  });
  if (error) throw new PlatformRunError(error.code);
  const reservation = Array.isArray(data) ? data[0] : data;
  if (!reservation) throw new PlatformRunError('P0002');
  return { reservation, payload, providerReview };
}
