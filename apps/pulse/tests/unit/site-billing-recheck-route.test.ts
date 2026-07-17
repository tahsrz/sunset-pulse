import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createDefaultLaunchKit } from '@/lib/sites/launchKit';

const routeMocks = vi.hoisted(() => ({
  requireOperatorRouteAccess: vi.fn(),
  isAuthResponse: vi.fn(),
  operatorAuditUser: vi.fn(() => ({ email: 'operator@example.test', role: 'local' })),
  readSiteConfig: vi.fn(),
  recheckSiteBillingFromStripe: vi.fn(),
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
vi.mock('@/lib/billing/siteBillingRecheck', () => ({
  recheckSiteBillingFromStripe: routeMocks.recheckSiteBillingFromStripe,
}));

import { POST } from '@/app/api/admin/sites/billing-recheck/route';

describe('admin site billing recheck route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireOperatorRouteAccess.mockResolvedValue({ allowed: true, mode: 'local', reason: 'local operator' });
    routeMocks.isAuthResponse.mockImplementation((value) => value instanceof Response);
    routeMocks.operatorAuditUser.mockReturnValue({ email: 'operator@example.test', role: 'local' });
    routeMocks.readSiteConfig.mockResolvedValue({
      ...createDefaultLaunchKit('broker-one'),
      billingProfile: {
        billingStatus: 'past_due',
        stripeSubscriptionId: 'sub_123',
      },
    });
    routeMocks.recheckSiteBillingFromStripe.mockResolvedValue({
      kit: { agentId: 'broker-one', status: 'active' },
      savedStores: ['supabase', 'mongo'],
      stripeSubscriptionId: 'sub_123',
      stripeStatus: 'active',
      selectedBy: 'stored_subscription',
    });
  });

  it('rechecks a site billing profile for operators', async () => {
    const response = await POST(request({ agentId: 'broker-one' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(expect.objectContaining({
      endpoint: '/api/admin/sites/billing-recheck',
      action: 'billing_recheck',
      stripeStatus: 'active',
      selectedBy: 'stored_subscription',
    }));
    expect(routeMocks.recheckSiteBillingFromStripe).toHaveBeenCalledWith(expect.objectContaining({
      kit: expect.objectContaining({ agentId: 'broker-one' }),
      source: 'admin-billing-recheck',
    }));
  });

  it('returns not found when the agent site is missing', async () => {
    routeMocks.readSiteConfig.mockResolvedValue(null);

    const response = await POST(request({ agentId: 'missing-site' }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toBe('Agent site not found.');
    expect(routeMocks.recheckSiteBillingFromStripe).not.toHaveBeenCalled();
  });

  it('rejects invalid payloads', async () => {
    const response = await POST(request({ agentId: '' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe('Invalid billing recheck request.');
  });
});

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/sites/billing-recheck', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
