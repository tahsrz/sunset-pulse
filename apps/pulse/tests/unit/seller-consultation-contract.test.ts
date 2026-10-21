import { describe, expect, it } from 'vitest';
import {
  savedSellerIdentitySchema,
  sellerAvailabilityWindowSchema,
  sellerAvailabilityResultSchema,
  sellerSlotSchema,
  sellerReservationResultSchema,
} from '@/lib/scheduling/sellerConsultationContract';

const identity = {
  leadId: '2c29a0b7-2aaf-42b8-b9f5-75a81315831d',
  funnelId: 'edc0d3bb-89c4-44d4-bb4d-23ad174e783b',
  agentId: 'agent-1',
  site: 'sunset-pulse',
};

describe('seller consultation scheduling contract', () => {
  it('requires saved, tenant-scoped seller identity', () => {
    expect(savedSellerIdentitySchema.safeParse(identity).success).toBe(true);
    expect(savedSellerIdentitySchema.safeParse({ ...identity, site: '' }).success).toBe(false);
    expect(savedSellerIdentitySchema.safeParse({ ...identity, extra: 'untrusted' }).success).toBe(false);
  });

  it('accepts only ordered availability windows up to fourteen days in a real time zone', () => {
    expect(sellerAvailabilityWindowSchema.safeParse({
      from: '2026-10-20T00:00:00Z',
      to: '2026-11-03T00:00:00Z',
      timeZone: 'America/Chicago',
    }).success).toBe(true);
    expect(sellerAvailabilityWindowSchema.safeParse({
      from: '2026-10-20T00:00:00Z',
      to: '2026-11-04T00:00:00Z',
      timeZone: 'America/Chicago',
    }).success).toBe(false);
    expect(sellerAvailabilityWindowSchema.safeParse({
      from: '2026-10-21T00:00:00Z',
      to: '2026-10-20T00:00:00Z',
      timeZone: 'America/Chicago',
    }).success).toBe(false);
    expect(sellerAvailabilityWindowSchema.safeParse({
      from: '2026-10-20T00:00:00Z',
      to: '2026-10-21T00:00:00Z',
      timeZone: 'Mars/Olympus',
    }).success).toBe(false);
  });

  it('rejects malformed or reversed provider slots', () => {
    expect(sellerSlotSchema.safeParse({
      id: 'provider-slot-1',
      startsAt: '2026-10-21T15:00:00Z',
      endsAt: '2026-10-21T15:30:00Z',
      timeZone: 'America/Chicago',
    }).success).toBe(true);
    expect(sellerSlotSchema.safeParse({
      id: 'provider-slot-1',
      startsAt: '2026-10-21T15:30:00Z',
      endsAt: '2026-10-21T15:00:00Z',
      timeZone: 'America/Chicago',
    }).success).toBe(false);
  });

  it('keeps reservation outcomes explicit when scheduling is unavailable', () => {
    expect(sellerAvailabilityResultSchema.safeParse({ status: 'unavailable', reason: 'not_configured' }).success).toBe(true);
    expect(sellerAvailabilityResultSchema.safeParse({
      status: 'available',
      slots: [{ id: 'slot-1', startsAt: '2026-10-21T15:30:00Z', endsAt: '2026-10-21T15:00:00Z', timeZone: 'America/Chicago' }],
    }).success).toBe(false);
    expect(sellerReservationResultSchema.safeParse({ status: 'unavailable', reason: 'not_configured' }).success).toBe(true);
    expect(sellerReservationResultSchema.safeParse({ status: 'unavailable', reason: 'calendar_key_missing' }).success).toBe(false);
  });
});
