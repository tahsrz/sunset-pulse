import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ from: vi.fn(), createBooking: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mocks.from } }));
vi.mock('@/lib/scheduling/commercialBooking', () => ({ createAuthoritativeCommercialBooking: mocks.createBooking }));

import { POST } from '@/app/api/scheduling/public/route';

const leadId = '11111111-1111-4111-8111-111111111111';
const funnelId = '22222222-2222-4222-8222-222222222222';
const base = { leadId, funnelId, site: 'agent-one.sunsetpulse.app', appointmentType: 'buyer_consultation', startTime: '2026-08-25T15:00:00.000Z', endTime: '2026-08-25T15:45:00.000Z', attendee: { name: 'Buyer One', email: 'buyer@example.com', phone: '', timeZone: 'America/Chicago' } };

function request(body: unknown) { return new NextRequest('http://localhost/api/scheduling/public', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
function leadChain(data: unknown) { return { select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data, error: null }) }) }) }) }) }; }

describe('public consultation scheduling route', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.from.mockReturnValue(leadChain({ id: leadId, funnel_id: funnelId, agent_id: 'agent-one', site: base.site })); mocks.createBooking.mockResolvedValue({ booking: { id: 'booking-1' }, duplicate: false }); });
  it('creates a booking after verifying lead lineage', async () => {
    const response = await POST(request(base));
    expect(response.status).toBe(201);
    expect(mocks.createBooking).toHaveBeenCalledWith(expect.objectContaining({ leadId, funnelId, agentId: 'agent-one', appointmentType: 'buyer_consultation' }));
  });
  it('returns duplicate bookings without creating a second outcome', async () => {
    mocks.createBooking.mockResolvedValue({ booking: { id: 'booking-1' }, duplicate: true });
    const response = await POST(request(base));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, duplicate: true });
  });
  it('rejects a lead that does not match the supplied site and funnel', async () => {
    mocks.from.mockReturnValue(leadChain(null));
    const response = await POST(request(base));
    expect(response.status).toBe(400);
    expect(mocks.createBooking).not.toHaveBeenCalled();
  });
});
