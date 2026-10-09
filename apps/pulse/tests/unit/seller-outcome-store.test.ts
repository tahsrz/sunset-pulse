import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc } }));

import { listOwnedSellerLeads, listOwnedSellerOutcomes } from '@/lib/realtor-workspace/leadStore.server';

const actor = '11111111-1111-4111-8111-111111111111';
const leadId = '22222222-2222-4222-8222-222222222222';
const event = (suffix: number) => ({
  id: `33333333-3333-4333-8333-${String(suffix).padStart(12, '0')}`,
  event_type: 'consultation_confirmed', lead_revision: 2,
  occurred_at: '2026-10-08T15:00:00+00:00', created_at: '2026-10-07T15:00:00+00:00', details: {},
});

describe('seller outcome reads', () => {
  beforeEach(() => { rpc.mockReset(); });

  it('continues tied-timestamp pages using the final ID and actor-bound context', async () => {
    rpc.mockResolvedValueOnce({ data: [event(3), event(2), event(1)], error: null });
    const page = await listOwnedSellerOutcomes(actor, { leadId, kind: 'consultation', limit: 2 });
    expect(page.events.map((row) => row.id)).toEqual([event(3).id, event(2).id]);
    expect(page.nextCursor).not.toBeNull();
    rpc.mockResolvedValueOnce({ data: [event(1)], error: null });
    const older = await listOwnedSellerOutcomes(actor, { leadId, kind: 'consultation', limit: 2, cursor: page.nextCursor });
    expect(rpc.mock.calls[1]).toEqual(['seller_lead_list_active_outcomes', {
      p_actor_id: actor, p_lead_id: leadId, p_event_type: 'consultation_confirmed', p_limit: 3,
      p_before_created_at: event(2).created_at, p_before_id: event(2).id,
    }]);
    expect(older.events.map((row) => row.id)).toEqual([event(1).id]);
    expect(older.nextCursor).toBeNull();
  });

  it('rejects cursors reused under a different owner, lead, kind, or page size before reading', async () => {
    rpc.mockResolvedValueOnce({ data: [event(3), event(2), event(1)], error: null });
    const page = await listOwnedSellerOutcomes(actor, { leadId, kind: 'consultation', limit: 2 });
    rpc.mockClear();
    for (const change of [
      { actorId: leadId }, { leadId: actor }, { kind: 'closing' }, { limit: 3 },
    ]) {
      const { actorId, ...queryChange } = change;
      await expect(listOwnedSellerOutcomes(actorId || actor, {
        leadId, kind: 'consultation', limit: 2, cursor: page.nextCursor, ...queryChange,
      })).rejects.toMatchObject({ code: 'INVALID' });
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects spoofed actor fields and malformed cursors before reading', async () => {
    await expect(listOwnedSellerOutcomes(actor, { leadId, kind: 'consultation', actorId: leadId })).rejects.toThrow();
    await expect(listOwnedSellerOutcomes(actor, { leadId, kind: 'consultation', cursor: 'bad-cursor' }))
      .rejects.toMatchObject({ code: 'INVALID' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('preserves read failures instead of returning an empty outcome list', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: 'XX000' } });
    await expect(listOwnedSellerOutcomes(actor, { leadId, kind: 'closing' })).rejects.toMatchObject({ code: 'FAILED' });
  });

  it('rechecks the same owner when reading bounded lead event history', async () => {
    rpc.mockResolvedValueOnce({ data: [{ id: leadId, created_at: '2026-10-07T15:00:00Z' }], error: null });
    rpc.mockResolvedValueOnce({ data: [], error: null });
    const page = await listOwnedSellerLeads(actor, { limit: 25 });
    expect(rpc.mock.calls[1]).toEqual(['seller_lead_read_recent_events', { p_actor_id: actor, p_lead_ids: [leadId] }]);
    expect(page.leads[0].sellerOutcomeEvents).toEqual([]);
  });
});
