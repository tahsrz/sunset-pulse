import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn(), delete: vi.fn(), lte: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mocks.from, rpc: mocks.rpc } }));

import { GET } from '@/app/api/admin/agent-leads/cma-retention/cron/route';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('CRON_SECRET', 'test-cron-secret');
  mocks.from.mockReturnValue({ delete: mocks.delete });
  mocks.delete.mockReturnValue({ lte: mocks.lte });
  mocks.lte.mockResolvedValue({ count: 4, error: null });
  mocks.rpc.mockResolvedValue({ data: 2, error: null });
});

afterEach(() => vi.unstubAllEnvs());

describe('seller retention cron', () => {
  it('requires the cron bearer secret without touching storage', async () => {
    const response = await GET(new NextRequest('https://sunsetpulse.app/api/admin/agent-leads/cma-retention/cron'));
    expect(response.status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('fails closed when the deployment has no cron secret', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const response = await GET(new NextRequest('https://sunsetpulse.app/api/admin/agent-leads/cma-retention/cron', {
      headers: { authorization: 'Bearer test-cron-secret' },
    }));
    expect(response.status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('deletes expired records only and reports the count without exposing record identifiers', async () => {
    const response = await GET(new NextRequest('https://sunsetpulse.app/api/admin/agent-leads/cma-retention/cron', {
      headers: { authorization: 'Bearer test-cron-secret' },
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith('seller_cma_private_details');
    expect(mocks.delete).toHaveBeenCalledWith({ count: 'exact' });
    expect(mocks.lte).toHaveBeenCalledWith('expires_at', expect.any(String));
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('purge_expired_guided_seller_intake');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toEqual({ ok: true, deletedCount: 4, prunedJourneyCount: 2 });
  });

  it('reports an idempotent no-op when there are no expired rows', async () => {
    mocks.lte.mockResolvedValue({ count: null, error: null });
    mocks.rpc.mockResolvedValue({ data: 0, error: null });
    const response = await GET(new NextRequest('https://sunsetpulse.app/api/admin/agent-leads/cma-retention/cron', {
      headers: { authorization: 'Bearer test-cron-secret' },
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, deletedCount: 0, prunedJourneyCount: 0 });
  });

  it('returns a generic failure without exposing database details', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.lte.mockResolvedValue({ count: null, error: { code: 'XX000', message: 'Sensitive property address' } });
    const response = await GET(new NextRequest('https://sunsetpulse.app/api/admin/agent-leads/cma-retention/cron', {
      headers: { authorization: 'Bearer test-cron-secret' },
    }));
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(JSON.stringify(body)).not.toContain('Sensitive property address');
    expect(log).toHaveBeenCalledWith('[SELLER_CMA_RETENTION_CRON]', 'XX000');
    expect(mocks.rpc).toHaveBeenCalledOnce();
    log.mockRestore();
  });

  it('reports a guided cleanup error even when CMA cleanup succeeds', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '57014', message: 'Sensitive intake details' } });
    const response = await GET(new NextRequest('https://sunsetpulse.app/api/admin/agent-leads/cma-retention/cron', {
      headers: { authorization: 'Bearer test-cron-secret' },
    }));
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'Expired guided seller answers could not be cleared.' });
    expect(log).toHaveBeenCalledExactlyOnceWith('[GUIDED_SELLER_RETENTION_CRON]', '57014');
    log.mockRestore();
  });
});
