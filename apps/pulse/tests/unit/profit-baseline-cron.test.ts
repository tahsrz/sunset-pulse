import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/profit/profitFunnelAnalytics', () => ({ captureProfitBaselineCheckpoint: mocks.capture }));

import { GET } from '@/app/api/admin/profit/baseline/cron/route';

describe('profit baseline checkpoint cron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'profit-secret';
    mocks.capture.mockResolvedValue({ checkpointDate: '2026-08-24', readinessStatus: 'not_ready', blockers: ['window'] });
  });

  it('rejects unauthenticated collection attempts', async () => {
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(mocks.capture).not.toHaveBeenCalled();
  });

  it('captures one privacy-safe daily baseline checkpoint', async () => {
    const response = await GET(request('Bearer profit-secret'));
    expect(response.status).toBe(200);
    expect(mocks.capture).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual({
      ok: true,
      result: { checkpointDate: '2026-08-24', readinessStatus: 'not_ready', blockers: ['window'] },
    });
  });
});

function request(authorization?: string) {
  return new NextRequest('http://localhost/api/admin/profit/baseline/cron', {
    headers: authorization ? { authorization } : {},
  });
}
