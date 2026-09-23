import 'server-only';

import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import type { WorkflowExecution, WorkflowJob } from './workflowRegistry.server';

const healthCheckPayloadSchema = z.object({
  workspaceId: z.string().uuid(),
  connectorId: z.string().uuid(),
  source: z.literal('fixture'),
  operation: z.string().regex(/^[a-z][a-z0-9_.:-]{0,127}$/).default('pinned_snapshot'),
}).strict();

/**
 * Records an operational fixture check through the existing durable scheduler.
 * It intentionally never contacts the connector endpoint or reads credentials.
 */
export async function runConnectorHealthCheck(job: WorkflowJob): Promise<WorkflowExecution> {
  const payload = healthCheckPayloadSchema.parse(job.payload || {});
  const { data: connector, error: connectorError } = await supabaseAdmin.from('platform_connector_definitions')
    .select('id,workspace_id,connection_id,title,status')
    .eq('id', payload.connectorId).eq('workspace_id', payload.workspaceId).maybeSingle();
  if (connectorError) throw new Error(`Connector health lookup failed: ${connectorError.message}`);
  if (!connector) throw new Error('Connector health target was not found.');

  const { data: snapshot, error: snapshotError } = await supabaseAdmin.from('platform_connector_schema_snapshots')
    .select('schema_hash')
    .eq('connector_id', connector.id).eq('workspace_id', connector.workspace_id)
    .eq('direction', 'output').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (snapshotError) throw new Error(`Connector snapshot lookup failed: ${snapshotError.message}`);

  let status: 'healthy' | 'unavailable';
  let detail: Record<string, string>;
  if (connector.status === 'reviewed' && snapshot) {
    status = 'healthy';
    detail = { source: payload.source, probe: payload.operation, snapshotHash: snapshot.schema_hash };
  } else {
    status = 'unavailable';
    detail = { source: payload.source, reason: connector.status === 'disabled' ? 'connector_disabled' : 'output_snapshot_missing' };
  }
  const { data: recorded, error: recordError } = await supabaseAdmin.rpc('platform_record_connector_health', {
    p_workspace_id: payload.workspaceId,
    p_connector_id: connector.id,
    p_status: status,
    p_checked_at: new Date().toISOString(),
    p_snapshot_hash: snapshot?.schema_hash || null,
    p_detail: detail,
  });
  if (recordError) throw new Error(`Connector health record failed: ${recordError.message}`);
  const row = Array.isArray(recorded) ? recorded[0] : recorded;
  if (!row?.id) throw new Error('Connector health record was not returned.');
  const { error: receiptError } = await supabaseAdmin.rpc('platform_record_connector_health_receipt', {
    p_workspace_id: payload.workspaceId,
    p_connector_id: connector.id,
    p_operation_id: job.id,
    p_health_id: row.id,
    p_status: status,
  });
  if (receiptError) throw new Error(`Connector health receipt failed: ${receiptError.message}`);
  return { kind: 'complete', resultType: 'connector_health', resultId: connector.id, resultStatus: status };
}
