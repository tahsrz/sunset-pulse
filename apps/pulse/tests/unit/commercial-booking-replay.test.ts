import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), attendee: vi.fn(), raced: false }));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mocks.from } }));
import { createAuthoritativeCommercialBooking } from '@/lib/scheduling/commercialBooking';

const input = {
  leadId: '11111111-1111-4111-8111-111111111111', funnelId: '22222222-2222-4222-8222-222222222222',
  agentId: 'agent-one', site: 'agent-one', appointmentType: 'seller_consultation' as const,
  listingId: null, idempotencyKey: 'fixture-booking-request', title: 'Fixture consultation', description: '',
  startTime: '2026-10-30T15:00:00.000Z', endTime: '2026-10-30T15:30:00.000Z',
  attendee: { email: 'fixture@example.test', name: 'Fixture', phone: '', timeZone: 'America/Chicago' },
};
let booking: Record<string, unknown>;
let reads: Array<Record<string, unknown>>;
beforeEach(() => {
  vi.clearAllMocks(); mocks.raced = false; reads = [];
  booking = { id: 'foreign-booking-sentinel', uid: 'uid', idempotency_key: input.idempotencyKey, lead_id: input.leadId, funnel_id: input.funnelId, agent_id: input.agentId, site: input.site };
  mocks.attendee.mockResolvedValue({ error: null });
  mocks.from.mockImplementation((table: string) => {
    if (table === 'scheduling_attendees') return { upsert: mocks.attendee };
    if (table === 'scheduling_bookings') return {
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { code: '23505', message: 'Idempotency key already used.' } }) }) }),
      select: () => {
        const filters: Record<string, unknown> = {};
        const query = { eq: (key: string, value: unknown) => { filters[key] = value; return query; }, maybeSingle: async () => {
          reads.push(filters);
          if (mocks.raced && reads.length === 1) return { data: null, error: null };
          return { data: Object.entries(filters).every(([key, value]) => booking[key] === value) ? booking : null, error: null };
        } };
        return query;
      },
    };
    if (table === 'agent_site_leads') {
      const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { id: input.leadId, funnel_id: input.funnelId, agent_id: input.agentId, site: input.site }, error: null }) };
      return query;
    }
    throw new Error(`Unexpected table ${table}`);
  });
});

describe('commercial booking replay lineage', () => {
  it('replays a matching request without inserting another booking', async () => {
    const result = await createAuthoritativeCommercialBooking(input);
    expect(result.duplicate).toBe(true);
    expect(mocks.attendee).toHaveBeenCalledTimes(1);
    expect(reads[0]).toEqual({ idempotency_key: input.idempotencyKey, lead_id: input.leadId, funnel_id: input.funnelId, agent_id: input.agentId, site: input.site });
  });
  it.each(['lead_id', 'funnel_id', 'agent_id', 'site'])('does not replay a key belonging to another %s or add its attendee', async field => {
    booking[field] = 'different-lineage';
    await expect(createAuthoritativeCommercialBooking(input)).rejects.toThrow('Unable to persist');
    expect(mocks.attendee).not.toHaveBeenCalled();
    expect(reads).toHaveLength(2);
    expect(reads[0]).toEqual(reads[1]); // The duplicate-insert recovery is scoped too.
  });
  it('recovers a same-lineage insert race with the same scoped lookup', async () => {
    mocks.raced = true;
    expect((await createAuthoritativeCommercialBooking(input)).duplicate).toBe(true);
    expect(reads).toHaveLength(2);
    expect(reads[0]).toEqual(reads[1]);
  });
});
