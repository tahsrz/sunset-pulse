import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ provision: vi.fn() }));
vi.mock('@/lib/sites/siteProvisioning', () => ({ provisionPaidAgentSite: mocks.provision }));

import { POST } from '@/app/api/internal/cms/test-site/route';

const request = (body: unknown, token = 'secret') => new NextRequest('https://sunsetpulse.app/api/internal/cms/test-site', {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-cms-test-seed-token': token }, body: JSON.stringify(body),
});

describe('CMS test-site seed route', () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.CMS_TEST_SEED_ENABLED = 'true'; process.env.CMS_TEST_SEED_TOKEN = 'secret'; });

  it('stays unavailable when disabled', async () => {
    process.env.CMS_TEST_SEED_ENABLED = 'false';
    expect((await POST(request({ runId: 'run-123', email: 'taz@example.com' }))).status).toBe(404);
    expect(mocks.provision).not.toHaveBeenCalled();
  });

  it('requires the server token', async () => {
    expect((await POST(request({ runId: 'run-123', email: 'taz@example.com' }, 'wrong'))).status).toBe(401);
    expect(mocks.provision).not.toHaveBeenCalled();
  });

  it('provisions only a disposable ID and returns its original pointer', async () => {
    mocks.provision.mockResolvedValue({ created: true, savedStores: ['mongo'], publicUrl: 'https://cms-verification-run-123.sunsetpulse.app', kit: { agentId: 'cms-verification-run-123', activeVibeRevisionId: '' } });
    const response = await POST(request({ runId: 'run-123', email: 'taz@example.com' }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ siteId: 'cms-verification-run-123', originalPointer: null });
    expect(mocks.provision).toHaveBeenCalledWith(expect.objectContaining({ agentId: 'cms-verification-run-123', source: 'cms-test-seed', billingStatus: 'trialing' }));
  });
});
