import 'server-only';

import { supabaseAdmin } from '@/lib/supabase';
import { requireWorkspaceAccess } from '@/lib/platform/access/workspaceAccess.server';
import { connectorDefinitionSchema, connectorSchemaSnapshotSchema } from '@/lib/platform/contracts/connector';
import { capabilityAdmissionInputSchema, validateCapabilityPayload } from '@/lib/platform/contracts/capabilityAdmission';
import { PlatformRunError } from '@/lib/platform/workflows/runStore.server';

export async function admitCapabilityOperation(actorId: string, workspaceId: string, input: unknown) {
  const value = capabilityAdmissionInputSchema.parse(input);
  await requireWorkspaceAccess(actorId, workspaceId, 'workflow:run');

  const { data: connector, error: connectorError } = await supabaseAdmin.from('platform_connector_definitions')
    .select('id,connection_id,status,definition,definition_hash')
    .eq('workspace_id', workspaceId).eq('connection_id', value.connectionId).maybeSingle();
  if (connectorError) throw new PlatformRunError(connectorError.code);
  if (!connector || connector.status !== 'reviewed') throw new PlatformRunError('P0002');
  connectorDefinitionSchema.parse(connector.definition);

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
    p_estimated_cost_usd: value.estimatedCostUsd,
  });
  if (error) throw new PlatformRunError(error.code);
  const reservation = Array.isArray(data) ? data[0] : data;
  if (!reservation) throw new PlatformRunError('P0002');
  return { reservation, payload };
}
