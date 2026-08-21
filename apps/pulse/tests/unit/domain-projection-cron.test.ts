import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ runWorker: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/tenancy/domainManifestWorker', () => ({
  runDomainManifestWorker: mocks.runWorker,
}));

import { GET } from '@/app/api/tenancy/domain-projection/cron/route';

describe('domain projection cron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'cron-test-secret';
    mocks.runWorker.mockResolvedValue({ claimed: 1, results: [{ id: 'job-1', status: 'succeeded' }] });
  });

  it('rejects unauthenticated invocations', async () => {
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(mocks.runWorker).not.toHaveBeenCalled();
  });

  it('runs the bounded projection worker for an authorized cron call', async () => {
    const response = await GET(request('Bearer cron-test-secret'));
    expect(response.status).toBe(200);
    expect(mocks.runWorker).toHaveBeenCalledWith(10);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      result: { claimed: 1, results: [{ id: 'job-1', status: 'succeeded' }] },
    });
  });
});

function request(authorization?: string) {
  return new NextRequest('http://localhost/api/tenancy/domain-projection/cron', {
    headers: authorization ? { authorization } : {},
  });
}
