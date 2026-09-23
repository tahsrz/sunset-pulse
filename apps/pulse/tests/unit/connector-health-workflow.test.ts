import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mocks.from, rpc: mocks.rpc } }));

import { runConnectorHealthCheck } from '@/lib/autonomous-workflows/connectorHealthWorkflow.server';

const workspaceId = '22222222-2222-4222-8222-222222222222';
const connectorId = '33333333-3333-4333-8333-333333333333';
const baseJob = {
  id: '44444444-4444-4444-8444-444444444444', user_id: '11111111-1111-4111-8111-111111111111',
  workflow_key: 'connector_health_check', trigger_kind: 'event' as const, event_key: 'health-1',
  payload_version: 1, scheduled_for: '2026-09-23T12:00:00.000Z', lease_token: '55555555-5555-4555-8555-555555555555',
};

function query(result: unknown) {
  const builder = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn() };
  builder.select.mockReturnValue(builder); builder.eq.mockReturnValue(builder); builder.order.mockReturnValue(builder); builder.limit.mockReturnValue(builder); builder.maybeSingle.mockResolvedValue(result);
  return builder;
}

describe('connector health scheduler boundary', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('records a fixture health check without dispatching a provider', async () => {
    mocks.from.mockReturnValueOnce(query({ data: { id: connectorId, workspace_id: workspaceId, connection_id: 'crm.local', title: 'CRM', status: 'reviewed' }, error: null }));
    mocks.from.mockReturnValueOnce(query({ data: { schema_hash: 'a'.repeat(64) }, error: null }));
    mocks.rpc
      .mockResolvedValueOnce({ data: [{ id: '66666666-6666-4666-8666-666666666666' }], error: null })
      .mockResolvedValueOnce({ data: [{ id: '77777777-7777-4777-8777-777777777777' }], error: null });

    const result = await runConnectorHealthCheck({ ...baseJob, payload: { workspaceId, connectorId, source: 'fixture', operation: 'pinned_snapshot' } });

    expect(result).toMatchObject({ kind: 'complete', resultType: 'connector_health', resultId: connectorId, resultStatus: 'healthy' });
    expect(mocks.rpc).toHaveBeenCalledWith('platform_record_connector_health', expect.objectContaining({ p_status: 'healthy', p_snapshot_hash: 'a'.repeat(64) }));
    expect(mocks.rpc).toHaveBeenCalledWith('platform_record_connector_health_receipt', expect.objectContaining({ p_operation_id: baseJob.id, p_status: 'healthy' }));
  });

  it('records unavailable when the connector is disabled or lacks an output snapshot', async () => {
    mocks.from.mockReturnValueOnce(query({ data: { id: connectorId, workspace_id: workspaceId, connection_id: 'crm.local', title: 'CRM', status: 'disabled' }, error: null }));
    mocks.from.mockReturnValueOnce(query({ data: null, error: null }));
    mocks.rpc
      .mockResolvedValueOnce({ data: [{ id: '66666666-6666-4666-8666-666666666666' }], error: null })
      .mockResolvedValueOnce({ data: [{ id: '77777777-7777-4777-8777-777777777777' }], error: null });

    await runConnectorHealthCheck({ ...baseJob, payload: { workspaceId, connectorId, source: 'fixture' } });

    expect(mocks.rpc).toHaveBeenCalledWith('platform_record_connector_health', expect.objectContaining({ p_status: 'unavailable', p_snapshot_hash: null, p_detail: { source: 'fixture', reason: 'connector_disabled' } }));
  });
});
