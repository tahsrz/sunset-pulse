import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ runWorker: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/intelligence/agentAlertNotifications', () => ({
  runAgentAlertNotificationWorker: mocks.runWorker,
}));

import { GET } from '@/app/api/notifications/high-intent/cron/route';

describe('high-intent notification cron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'cron-test-secret';
    mocks.runWorker.mockResolvedValue({ sent: 1, failed: 0, suppressed: 0 });
  });

  it('rejects unauthenticated invocations', async () => {
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(mocks.runWorker).not.toHaveBeenCalled();
  });

  it('runs a bounded worker for Vercel cron', async () => {
    const response = await GET(request('Bearer cron-test-secret'));
    expect(response.status).toBe(200);
    expect(mocks.runWorker).toHaveBeenCalledWith(20);
  });
});

function request(authorization?: string) {
  return new NextRequest('http://localhost/api/notifications/high-intent/cron', {
    headers: authorization ? { authorization } : {},
  });
}
