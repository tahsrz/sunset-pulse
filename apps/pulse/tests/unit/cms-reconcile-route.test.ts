import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ reconcile: vi.fn() }));
vi.mock('@/lib/sites/siteProvisioning', () => ({ reconcileDisposableCmsSite: mocks.reconcile }));
import { POST } from '@/app/api/internal/cms/test-site/reconcile/route';

const request = (body: unknown) => new NextRequest('https://sunsetpulse.app/api/internal/cms/test-site/reconcile', { method: 'POST', headers: { 'content-type': 'application/json', 'x-cms-test-seed-token': 'secret' }, body: JSON.stringify(body) });

describe('CMS reconcile route', () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.CMS_TEST_SEED_ENABLED = 'true'; process.env.CMS_TEST_SEED_TOKEN = 'secret'; process.env.CMS_TEST_SEED_OWNER_EMAIL = 'taz@example.com'; process.env.CMS_TEST_SEED_OWNER_USER_ID = 'user-taz'; });
  it('returns the reconciliation result with diagnostics', async () => {
    mocks.reconcile.mockResolvedValue({ siteId: 'cms-verification-run-123', savedStores: ['supabase', 'mongo'], reconciled: true, originalPointer: null, currentPointer: null });
    const response = await POST(request({ runId: 'run-123', email: 'taz@example.com' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ siteId: 'cms-verification-run-123', reconciled: true, correlationId: expect.any(String), elapsedMs: expect.any(Number) });
  });
});
