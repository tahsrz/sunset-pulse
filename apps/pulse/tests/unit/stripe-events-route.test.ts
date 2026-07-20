import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createDefaultLaunchKit } from '@/lib/sites/launchKit';

const routeMocks = vi.hoisted(() => ({
  requireOperatorRouteAccess: vi.fn(),
  isAuthResponse: vi.fn(),
  operatorAuditUser: vi.fn(() => ({ email: 'operator@example.test', role: 'local' })),
  readSiteConfig: vi.fn(),
  listStripeWebhookEvents: vi.fn(),
  replayStripeSiteEvent: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({
  requireOperatorRouteAccess: routeMocks.requireOperatorRouteAccess,
  isAuthResponse: routeMocks.isAuthResponse,
  operatorAuditUser: routeMocks.operatorAuditUser,
}));
vi.mock('@/lib/sites/siteConfigStore', () => ({
  readSiteConfig: routeMocks.readSiteConfig,
}));
vi.mock('@/lib/billing/stripeWebhookLedger', () => ({
  listStripeWebhookEvents: routeMocks.listStripeWebhookEvents,
}));
vi.mock('@/lib/billing/stripeEventReplay', () => ({
  replayStripeSiteEvent: routeMocks.replayStripeSiteEvent,
}));

import { GET, POST } from '@/app/api/admin/stripe-events/route';

describe('admin Stripe events route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireOperatorRouteAccess.mockResolvedValue({ allowed: true, mode: 'local', reason: 'local operator' });
    routeMocks.isAuthResponse.mockImplementation((value) => value instanceof Response);
    routeMocks.operatorAuditUser.mockReturnValue({ email: 'operator@example.test', role: 'local' });
    routeMocks.readSiteConfig.mockResolvedValue({
      ...createDefaultLaunchKit('broker-one'),
      billingProfile: {
        stripeCheckoutSessionId: 'cs_123',
        stripeSubscriptionId: 'sub_123',
        stripeCustomerId: 'cus_123',
        billingStatus: 'trialing',
      },
    });
    routeMocks.listStripeWebhookEvents.mockResolvedValue([
      {
        eventId: 'evt_123',
        eventType: 'checkout.session.completed',
        objectId: 'cs_123',
        status: 'succeeded',
        stores: ['supabase'],
      },
    ]);
    routeMocks.replayStripeSiteEvent.mockResolvedValue({
      eventId: 'evt_123',
      eventType: 'checkout.session.completed',
      action: 'checkout_replayed',
      objectId: 'cs_123',
      stripeSubscriptionId: 'sub_123',
      stripeStatus: 'trialing',
      kit: { agentId: 'broker-one' },
      savedStores: ['supabase', 'mongo'],
    });
  });

  it('lists Stripe events linked to a site billing profile', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/stripe-events?agentId=broker-one'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(routeMocks.listStripeWebhookEvents).toHaveBeenCalledWith({
      objectIds: ['cs_123', 'sub_123', 'cus_123'],
      limit: 25,
    });
    expect(body.data.events).toHaveLength(1);
  });

  it('replays a Stripe event for operators', async () => {
    const response = await POST(request({ agentId: 'broker-one', eventId: 'evt_123' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.action).toBe('checkout_replayed');
    expect(routeMocks.replayStripeSiteEvent).toHaveBeenCalledWith({
      eventId: 'evt_123',
      agentId: 'broker-one',
      source: 'admin-stripe-event-replay',
    });
  });

  it('rejects invalid replay payloads', async () => {
    const response = await POST(request({ eventId: '' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe('Invalid Stripe event replay request.');
  });
});

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/stripe-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
