import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), createBooking: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mocks.from } }));
vi.mock('@/lib/scheduling/commercialBooking', () => ({ createAuthoritativeCommercialBooking: mocks.createBooking }));
import { POST } from '@/app/api/scheduling/public/route';

describe('legacy public consultation writer', () => {
  beforeEach(() => vi.clearAllMocks());
  it('does not create a booking without a verified reservation authority', async () => {
    const response = await POST();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, code: 'CONSULTATION_BOOKING_NOT_CONFIGURED' });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.createBooking).not.toHaveBeenCalled();
  });
  it('does not cache an unavailable booking result or issue a booking ID', async () => {
    const response = await POST();
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).not.toHaveProperty('bookingId');
  });
});
