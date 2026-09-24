import { describe, expect, it } from 'vitest';
import { connectorDefinitionSchema, connectorSchemaSnapshotSchema } from '@/lib/platform/contracts/connector';

const hash = 'a'.repeat(64);

describe('platform connector contracts', () => {
  it('accepts reviewed HTTPS connector metadata and a bounded schema snapshot', () => {
    expect(connectorDefinitionSchema.parse({ schemaVersion: 1, connectionId: 'crm.local', protocol: 'mcp', title: 'CRM', endpoint: 'https://crm.example.test/mcp', authRef: 'crm-secret', reviewedAt: '2026-09-22T12:00:00.000Z' })).toHaveProperty('protocol', 'mcp');
    expect(connectorSchemaSnapshotSchema.parse({ schemaVersion: 1, connectionId: 'crm.local', tool: 'contacts', operation: 'lookup', direction: 'input', schemaHash: hash, schema: { type: 'object', properties: { email: { type: 'string', maxLength: 320 } }, required: ['email'], additionalProperties: false } })).toHaveProperty('direction', 'input');
  });

  it.each([
    { endpoint: 'http://crm.example.test/mcp' },
    { snapshot: { schemaVersion: 1, connectionId: 'crm.local', tool: 'contacts', operation: 'lookup', direction: 'input', schemaHash: hash, schema: { type: 'object', properties: {}, required: [], additionalProperties: false, $ref: 'file:///evil' } } },
  ])('rejects unsafe connector metadata', (value) => {
    if ('endpoint' in value) expect(() => connectorDefinitionSchema.parse({ schemaVersion: 1, connectionId: 'crm.local', protocol: 'mcp', title: 'CRM', endpoint: value.endpoint, authRef: null, reviewedAt: '2026-09-22T12:00:00.000Z' })).toThrow();
    else expect(() => connectorSchemaSnapshotSchema.parse(value.snapshot)).toThrow();
  });
});
