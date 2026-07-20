import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  applyApiRateLimit: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/core/apiRateLimit', () => ({ applyApiRateLimit: mocks.applyApiRateLimit }));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc: mocks.rpc } }));

import { applyPublicApiRateLimit } from '@/lib/core/publicApiRateLimit';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({
    data: [{ is_limited: false, remaining: 9, reset_at: new Date(Date.now() + 60_000).toISOString() }],
    error: null,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('public API distributed rate limiting', () => {
  it('hashes the client identity before the shared atomic RPC', async () => {
    const request = new Request('https://jamie.sunsetpulse.app/api/jamie/guide', {
      headers: { 'x-vercel-forwarded-for': '203.0.113.42' },
    });

    await expect(applyPublicApiRateLimit(request, 'jamie-public-guide', 10)).resolves.toBeNull();
    expect(mocks.rpc).toHaveBeenCalledWith('consume_public_rate_limit', expect.objectContaining({
      p_key_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      p_limit: 10,
      p_window_seconds: 60,
    }));
    expect(JSON.stringify(mocks.rpc.mock.calls[0][1])).not.toContain('203.0.113.42');
  });

  it('returns a standards-compatible 429 decision from the shared backend', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ is_limited: true, remaining: 0, reset_at: new Date(Date.now() + 30_000).toISOString() }],
      error: null,
    });
    const response = await applyPublicApiRateLimit(
      new Request('https://jamie.sunsetpulse.app/api/jamie/guide'),
      'jamie-public-guide',
      10,
    );

    expect(response?.status).toBe(429);
    expect(Number(response?.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('uses the local limiter only outside production when the shared backend is unavailable', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'missing migration' } });
    mocks.applyApiRateLimit.mockResolvedValue(null);

    await applyPublicApiRateLimit(
      new Request('http://jamie.localhost:3015/api/jamie/guide'),
      'jamie-public-guide',
      10,
    );

    expect(mocks.applyApiRateLimit).toHaveBeenCalledWith(
      expect.stringMatching(/^public-dev:[a-f0-9]{64}$/),
      10,
    );
  });

  it('fails closed in production when the shared backend is unavailable', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'database unavailable' } });

    const response = await applyPublicApiRateLimit(
      new Request('https://jamie.sunsetpulse.app/api/jamie/guide'),
      'jamie-public-guide',
      10,
    );

    expect(response?.status).toBe(503);
    expect(response?.headers.get('retry-after')).toBe('5');
    expect(mocks.applyApiRateLimit).not.toHaveBeenCalled();
  });
});
