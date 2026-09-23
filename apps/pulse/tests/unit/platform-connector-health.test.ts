import { describe, expect, it } from 'vitest';
import { connectorHealthEventSchema } from '@/lib/platform/contracts/connectorHealth';

describe('connector health evidence contract', () => {
  it('accepts bounded reviewed health states without secrets or executable fields', () => {
    expect(connectorHealthEventSchema.parse({
      schemaVersion: 1,
      connectorId: '11111111-1111-4111-8111-111111111111',
      connectionId: 'crm.local',
      title: 'CRM',
      status: 'schema_drift',
      checkedAt: '2026-09-23T12:00:00.000Z',
      snapshotHash: 'a'.repeat(64),
      detail: { source: 'fixture', reason: 'snapshot_changed' },
    }).status).toBe('schema_drift');
  });

  it('rejects unsupported health states and executable detail values', () => {
    expect(() => connectorHealthEventSchema.parse({
      schemaVersion: 1,
      connectorId: '11111111-1111-4111-8111-111111111111',
      connectionId: 'crm.local',
      title: 'CRM',
      status: 'ready',
      checkedAt: '2026-09-23T12:00:00.000Z',
      snapshotHash: null,
      detail: { command: { run: 'curl' } },
    })).toThrow();
  });
});
