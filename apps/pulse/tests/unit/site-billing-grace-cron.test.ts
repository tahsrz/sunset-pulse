import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const cronMocks = vi.hoisted(() => ({
  expirePastDueGracePeriods: vi.fn(),
  expireDisposableCmsSites: vi.fn(),
}));

vi.mock('@/lib/sites/siteProvisioning', () => ({
  expirePastDueGracePeriods: cronMocks.expirePastDueGracePeriods,
  expireDisposableCmsSites: cronMocks.expireDisposableCmsSites,
}));

import { GET } from '@/app/api/billing/grace-expiry/cron/route';

describe('site billing grace expiry cron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'cron_secret_123';
    cronMocks.expirePastDueGracePeriods.mockResolvedValue({
      scanned: 1,
      expired: 1,
      skipped: 0,
      processed: [{ agentId: 'broker-one', status: 'expired' }],
    });
    cronMocks.expireDisposableCmsSites.mockResolvedValue({ scanned: 1, expired: 1, processed: [{ agentId: 'cms-verification-run-123', status: 'suspended' }] });
  });

  it('requires the cron bearer token', async () => {
    const response = await GET(new NextRequest('http://localhost/api/billing/grace-expiry/cron'));

    expect(response.status).toBe(401);
    expect(cronMocks.expirePastDueGracePeriods).not.toHaveBeenCalled();
  });

  it('expires past-due grace windows for authorized cron calls', async () => {
    const response = await GET(new NextRequest('http://localhost/api/billing/grace-expiry/cron?limit=25', {
      headers: { Authorization: 'Bearer cron_secret_123' },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(expect.objectContaining({
      message: 'Site billing and disposable CMS expiry checks completed.',
      billingGrace: expect.objectContaining({ scanned: 1, expired: 1, skipped: 0 }),
      disposableCms: expect.objectContaining({ scanned: 1, expired: 1 }),
    }));
    expect(cronMocks.expirePastDueGracePeriods).toHaveBeenCalledWith({
      limit: 25,
      source: 'site-billing-grace-cron',
    });
  });
});
