import { describe, expect, it } from 'vitest';
import { validateCapabilityPayload } from '@/lib/platform/contracts/capabilityAdmission';

const schema = { type: 'object', properties: { email: { type: 'string', maxLength: 320 }, priority: { type: 'number', minimum: 1, maximum: 5 } }, required: ['email'], additionalProperties: false };

describe('platform capability payload admission', () => {
  it('validates payloads against the bounded reviewed schema', () => {
    expect(validateCapabilityPayload(schema, { email: 'owner@example.test', priority: 3 })).toEqual({ email: 'owner@example.test', priority: 3 });
    expect(() => validateCapabilityPayload(schema, { priority: 3 })).toThrow();
    expect(() => validateCapabilityPayload(schema, { email: 'owner@example.test', extra: true })).toThrow();
    expect(() => validateCapabilityPayload(schema, { email: 'owner@example.test', priority: 9 })).toThrow();
  });
});
