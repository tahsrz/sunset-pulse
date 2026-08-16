import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ heartbeat: vi.fn(), alert: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/wikipedia_heartbeat', () => ({ readWikipediaHeartbeat: mocks.heartbeat }));
vi.mock('@/lib/notifications/agentAlertChannels', () => ({ dispatchOperationalAlert: mocks.alert }));

import { GET } from '@/app/api/atlas/processes/health/route';

describe('Wikipedia health cron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'health-secret';
    mocks.alert.mockResolvedValue({ status: 'sent', provider: 'resend', messageId: 'message-1' });
  });

  it('does not alert for a fresh healthy crawler', async () => {
    mocks.heartbeat.mockResolvedValue({
      crawlerId: 'wikipedia-en', status: 'imported', updatedAt: new Date().toISOString(),
      payload: { state: { health: { status: 'healthy', retryDrainRate: 100 } } },
    });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(mocks.alert).not.toHaveBeenCalled();
  });

  it('alerts when the crawler heartbeat is stale', async () => {
    mocks.heartbeat.mockResolvedValue({
      crawlerId: 'wikipedia-en', status: 'imported', updatedAt: new Date(Date.now() - 20 * 60_000).toISOString(),
      payload: { state: { health: { status: 'healthy', retryDrainRate: 100, retryBacklog: 12 } } },
    });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(mocks.alert).toHaveBeenCalledWith(expect.objectContaining({ subject: expect.stringContaining('healthy') }));
  });
});

function request() {
  return new NextRequest('http://localhost/api/atlas/processes/health', {
    headers: { authorization: 'Bearer health-secret' },
  });
}
