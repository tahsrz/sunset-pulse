import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  applyPublicApiRateLimit: vi.fn(),
  discoverListingById: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/core/publicApiRateLimit', () => ({
  applyPublicApiRateLimit: mocks.applyPublicApiRateLimit,
}));
vi.mock('@/lib/data/listingDiscovery', () => ({
  discoverListingById: mocks.discoverListingById,
}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc: mocks.rpc } }));

import { POST } from '@/app/api/intelligence/visitor-events/route';

describe('visitor intelligence events route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.applyPublicApiRateLimit.mockResolvedValue(null);
    mocks.discoverListingById.mockResolvedValue({
      id: 'listing-record-id',
      mls_id: 'MLS-101',
      name: '101 Verified Street',
    });
    mocks.rpc.mockResolvedValue({ error: null });
  });

  it('records a canonical property view under a server-issued visitor identity', async () => {
    const response = await POST(new Request('https://sunsetpulse.app/api/intelligence/visitor-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'property_viewed', propertyId: 'browser-supplied-id' }),
    }));

    expect(response.status).toBe(204);
    expect(response.headers.get('set-cookie')).toContain('sunset_visitor_session=');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(mocks.discoverListingById).toHaveBeenCalledWith('browser-supplied-id');
    expect(mocks.rpc).toHaveBeenCalledWith('log_intelligence_event', expect.objectContaining({
      p_type: 'VISITOR_PROPERTY_VIEWED',
      p_actor_id: expect.stringMatching(/^public:[0-9a-f]{20}$/),
      p_target_id: 'MLS-101',
      p_metadata: expect.objectContaining({
        propertyIds: ['MLS-101'],
        sessionVersion: 1,
      }),
    }));
    expect(JSON.stringify(mocks.rpc.mock.calls[0])).not.toContain('browser-supplied-id');
  });

  it('rejects property events that cannot be resolved canonically', async () => {
    mocks.discoverListingById.mockResolvedValue(null);

    const response = await POST(new Request('https://sunsetpulse.app/api/intelligence/visitor-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'property_viewed', propertyId: 'missing' }),
    }));

    expect(response.status).toBe(404);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('requires two distinct canonical listings for a comparison event', async () => {
    const response = await POST(new Request('https://sunsetpulse.app/api/intelligence/visitor-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'properties_compared', propertyIds: ['listing-record-id', 'MLS-101'] }),
    }));

    expect(response.status).toBe(404);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
