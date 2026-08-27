import { describe, expect, it } from 'vitest';
import { commercialBookingInputSchema } from '@/lib/scheduling/commercialBooking';

const valid = {
  leadId: '11111111-1111-4111-8111-111111111111',
  funnelId: '22222222-2222-4222-8222-222222222222',
  agentId: 'agent-one',
  site: 'agent-one.sunsetpulse.app',
  appointmentType: 'property_tour' as const,
  listingId: 'MLS-104',
  idempotencyKey: 'booking:lead-one:2026-08-25T15:00:00Z',
  title: 'Tour MLS-104',
  description: 'Requested through Jamie.',
  startTime: '2026-08-25T15:00:00.000Z',
  endTime: '2026-08-25T15:45:00.000Z',
  attendee: {
    email: 'buyer@example.com',
    name: 'Buyer One',
    phone: '+18175550123',
    timeZone: 'America/Chicago',
  },
};

describe('LUNA-201 commercial booking contract', () => {
  it('accepts an attributable property tour', () => {
    expect(commercialBookingInputSchema.parse(valid)).toEqual(valid);
  });

  it('normalizes attendee email for idempotent attendee projection', () => {
    const parsed = commercialBookingInputSchema.parse({
      ...valid,
      attendee: { ...valid.attendee, email: 'Buyer@Example.COM' },
    });
    expect(parsed.attendee.email).toBe('buyer@example.com');
  });

  it('requires a verified listing for property tours', () => {
    const result = commercialBookingInputSchema.safeParse({ ...valid, listingId: null });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.listingId).toContain('A property tour requires a verified listing ID.');
  });

  it('requires the end time to follow the start time', () => {
    const result = commercialBookingInputSchema.safeParse({ ...valid, endTime: valid.startTime });
    expect(result.success).toBe(false);
  });

  it.each(['buyer_consultation', 'rental_consultation', 'seller_consultation'] as const)(
    'supports %s without inventing listing evidence',
    (appointmentType) => {
      expect(commercialBookingInputSchema.safeParse({ ...valid, appointmentType, listingId: null }).success).toBe(true);
    },
  );

  it('rejects malformed lineage and weak idempotency keys', () => {
    expect(commercialBookingInputSchema.safeParse({ ...valid, funnelId: 'session-1' }).success).toBe(false);
    expect(commercialBookingInputSchema.safeParse({ ...valid, idempotencyKey: 'short' }).success).toBe(false);
  });
});
