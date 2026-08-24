import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { rpc: mocks.rpc, from: mocks.from },
}));

import { runDomainManifestWorker } from '@/lib/tenancy/domainManifestWorker';

describe('domain manifest worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PULSE_DOMAIN_PROJECTION_ID = 'ecfg_test';
    process.env.PULSE_DOMAIN_PROJECTION_TOKEN = 'read-token';
    process.env.VERCEL_API_TOKEN = 'write-token';
    mocks.rpc
      .mockResolvedValueOnce({
        data: [{ id: 'job-1', domain_id: 'domain-1', operation: 'upsert', target_revision: 2 }],
        error: null,
      })
      .mockResolvedValueOnce({ data: true, error: null });
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({
          data: {
            id: 'domain-1', hostname: 'taz.sunsetpulse.app', environment: 'production', revision: 2,
            deleted_at: null, site_config: { id: 'tenant-1', agent_id: 'agent-1', subdomain: 'taz' },
          }, error: null,
        }) }),
      }),
    });
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ digest: 'digest-2' }), { status: 200 })));
  });

  it('publishes the claimed revision and completes its lease', async () => {
    await expect(runDomainManifestWorker(10)).resolves.toEqual({
      claimed: 1,
      results: [{ id: 'job-1', status: 'succeeded' }],
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, 'claim_domain_manifest_outbox', expect.objectContaining({ p_limit: 10 }));
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, 'complete_domain_manifest_outbox', expect.objectContaining({
      p_outbox_id: 'job-1', p_edge_config_version: 'digest-2',
    }));
  });

  it('returns a failed publication to retryable state', async () => {
    const response = vi.mocked(fetch);
    response.mockReset();
    response.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));
    response.mockResolvedValueOnce(new Response('failure', { status: 500 }));
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValueOnce({
      data: [{ id: 'job-1', domain_id: 'domain-1', operation: 'upsert', target_revision: 2 }], error: null,
    });
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn() }) }) });
    mocks.from.mockImplementationOnce(() => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({
        data: { id: 'domain-1', hostname: 'taz.sunsetpulse.app', environment: 'production', revision: 2, deleted_at: null,
          site_config: { id: 'tenant-1', agent_id: 'agent-1', subdomain: 'taz' } }, error: null,
      }) }) }),
    })).mockImplementationOnce(() => ({ update }));

    const result = await runDomainManifestWorker(10);
    expect(result.results[0]).toMatchObject({ id: 'job-1', status: 'failed' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ state: 'retryable', last_error_code: 'PROJECTION_FAILED' }));
  });
});
