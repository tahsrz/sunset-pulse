import { describe, expect, it } from 'vitest';
import { sellerLeadActionSchema, sellerLeadPageSchema } from '@/lib/realtor-workspace/leadContracts';

const identity = {
  leadId: '4b3f6c6d-b88c-4e24-8c4a-4c1c9d79f4b2',
  expectedRevision: 3,
  requestKey: '04bc1ed5-4512-4f87-a5a2-d4c973860ec1',
};

describe('seller lead action contract', () => {
  it('accepts only recorded email contact and customer replies', () => {
    expect(sellerLeadActionSchema.safeParse({
      ...identity,
      action: 'record_contact',
      channel: 'email',
      occurredAt: '2026-10-06T15:00:00.000Z',
    }).success).toBe(true);
    expect(sellerLeadActionSchema.safeParse({
      ...identity,
      action: 'record_contact',
      channel: 'sms',
      occurredAt: '2026-10-06T15:00:00.000Z',
    }).success).toBe(false);
    expect(sellerLeadActionSchema.safeParse({
      ...identity,
      action: 'record_response',
      source: 'appointment_booked',
      occurredAt: '2026-10-06T15:00:00.000Z',
    }).success).toBe(false);
  });

  it('requires a UUID for outcome targets and bounds cursor pages to 50', () => {
    expect(sellerLeadActionSchema.safeParse({
      ...identity,
      action: 'void_outcome',
      outcomeEventId: 'bad-id',
      reason: 'Entered in error',
    }).success).toBe(false);
    expect(sellerLeadPageSchema.parse({ limit: '50' }).limit).toBe(50);
    expect(sellerLeadPageSchema.safeParse({ limit: '51' }).success).toBe(false);
  });
});
