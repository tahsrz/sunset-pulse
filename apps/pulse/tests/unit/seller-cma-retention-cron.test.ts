import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn(), delete: vi.fn(), lt: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mocks.from } }));

import { GET } from '@/app/api/admin/agent-leads/cma-retention/cron/route';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('CRON_SECRET', 'test-cron-secret');
  mocks.from.mockReturnValue({ delete: mocks.delete });
  mocks.delete.mockReturnValue({ lt: mocks.lt });
  mocks.lt.mockResolvedValue({ count: 4, error: null });
});

afterEach(() => vi.unstubAllEnvs());

describe('private CMA retention cron', () => {
  it('requires the cron bearer secret without touching storage', async () => {
    const response = await GET(new NextRequest('https://sunsetpulse.app/api/admin/agent-leads/cma-retention/cron'));
    expect(response.status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('deletes expired records only and reports the count without exposing record identifiers', async () => {
    const response = await GET(new NextRequest('https://sunsetpulse.app/api/admin/agent-leads/cma-retention/cron', {
      headers: { authorization: 'Bearer test-cron-secret' },
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith('seller_cma_private_details');
    expect(mocks.delete).toHaveBeenCalledWith({ count: 'exact' });
    expect(mocks.lt).toHaveBeenCalledWith('expires_at', expect.any(String));
    expect(body).toEqual({ ok: true, deletedCount: 4 });
  });
});
