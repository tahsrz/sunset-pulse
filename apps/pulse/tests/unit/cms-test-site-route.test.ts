import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ provision: vi.fn(), suspend: vi.fn(), readSiteConfig: vi.fn(), inspectSiteConfigStores: vi.fn() }));
vi.mock('@/lib/sites/siteProvisioning', () => ({ provisionDisposableCmsSite: mocks.provision, revokeDisposableCmsSite: mocks.suspend }));
vi.mock('@/lib/sites/siteConfigStore', () => ({ readSiteConfig: mocks.readSiteConfig, inspectSiteConfigStores: mocks.inspectSiteConfigStores }));

import { DELETE, GET, POST } from '@/app/api/internal/cms/test-site/route';

const request = (body: unknown, token = 'secret') => new NextRequest('https://sunsetpulse.app/api/internal/cms/test-site', {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-cms-test-seed-token': token }, body: JSON.stringify(body),
});

describe('CMS test-site seed route', () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.CMS_TEST_SEED_ENABLED = 'true'; process.env.CMS_TEST_SEED_TOKEN = 'secret'; process.env.CMS_TEST_SEED_OWNER_EMAIL = 'taz@example.com'; process.env.CMS_TEST_SEED_OWNER_USER_ID = 'user-taz'; mocks.readSiteConfig.mockResolvedValue(null); mocks.inspectSiteConfigStores.mockResolvedValue({ supabaseRow: null, mongoRow: null, selectedRow: null, selectedStore: null }); });

  it('stays unavailable when disabled', async () => {
    process.env.CMS_TEST_SEED_ENABLED = 'false';
    expect((await POST(request({ runId: 'run-123', email: 'taz@example.com' }))).status).toBe(404);
    expect((await GET(new NextRequest('https://sunsetpulse.app/api/internal/cms/test-site?runId=run-123&email=taz%40example.com', { headers: { 'x-cms-test-seed-token': 'secret' } }))).status).toBe(404);
    expect((await DELETE(new NextRequest('https://sunsetpulse.app/api/internal/cms/test-site?runId=run-123&email=taz%40example.com', { method: 'DELETE', headers: { 'x-cms-test-seed-token': 'secret' } }))).status).toBe(404);
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
    expect(await response.json()).toMatchObject({ siteId: 'cms-verification-run-123', originalPointer: null, correlationId: expect.any(String), elapsedMs: expect.any(Number) });
    expect(mocks.provision).toHaveBeenCalledWith({ runId: 'run-123', ownerName: 'CMS Verification', email: 'taz@example.com', userId: 'user-taz' });
  });

  it('returns a safe structured response when provisioning fails', async () => {
    mocks.provision.mockRejectedValue(new TypeError('database details must not escape'));
    const response = await POST(request({ runId: 'run-123', email: 'taz@example.com' }));
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: 'Seed operation failed.', runId: 'run-123', siteId: 'cms-verification-run-123', stage: 'provisioning', errorClass: 'TypeError', reconciliationRequired: true, correlationId: expect.any(String), elapsedMs: expect.any(Number) });
  });

  it('returns an existing seed site without writing again', async () => {
    mocks.readSiteConfig.mockResolvedValue({ agentId: 'cms-verification-run-123', ownerId: 'user-taz', activeVibeRevisionId: 'revision-one' });
    const response = await POST(request({ runId: 'run-123', email: 'taz@example.com' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ siteId: 'cms-verification-run-123', originalPointer: 'revision-one', created: false, idempotent: true });
    expect(mocks.provision).not.toHaveBeenCalled();
  });

  it('rejects an existing deterministic site owned by another user', async () => {
    mocks.readSiteConfig.mockResolvedValue({ agentId: 'cms-verification-run-123', ownerId: 'other-user', billingProfile: { userId: 'other-user' } });
    expect((await POST(request({ runId: 'run-123', email: 'taz@example.com' }))).status).toBe(403);
    expect(mocks.provision).not.toHaveBeenCalled();
  });

  it('fails closed when the configured owner controls are incomplete', async () => {
    delete process.env.CMS_TEST_SEED_OWNER_USER_ID;
    expect((await POST(request({ runId: 'run-123', email: 'taz@example.com' }))).status).toBe(403);
    expect(mocks.provision).not.toHaveBeenCalled();
  });

  it('fails closed when the configured owner email is absent', async () => {
    delete process.env.CMS_TEST_SEED_OWNER_EMAIL;
    expect((await POST(request({ runId: 'run-123', email: 'taz@example.com' }))).status).toBe(403);
    expect(mocks.provision).not.toHaveBeenCalled();
  });

  it('revokes only the derived disposable site', async () => {
    mocks.suspend.mockResolvedValue({ kit: { agentId: 'cms-verification-run-123', status: 'suspended' } });
    const response = await DELETE(new NextRequest('https://sunsetpulse.app/api/internal/cms/test-site?runId=run-123&email=taz%40example.com', { method: 'DELETE', headers: { 'x-cms-test-seed-token': 'secret' } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ siteId: 'cms-verification-run-123', revoked: true, correlationId: expect.any(String), elapsedMs: expect.any(Number) });
    expect(mocks.suspend).toHaveBeenCalledWith({ runId: 'run-123', email: 'taz@example.com', userId: 'user-taz' });
  });

  it('does not rewrite an already revoked disposable site', async () => {
    mocks.readSiteConfig.mockResolvedValue({
      agentId: 'cms-verification-run-123',
      status: 'suspended',
      billingProfile: { billingStatus: 'canceled' },
    });
    const response = await DELETE(new NextRequest('https://sunsetpulse.app/api/internal/cms/test-site?runId=run-123&email=taz%40example.com', { method: 'DELETE', headers: { 'x-cms-test-seed-token': 'secret' } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ siteId: 'cms-verification-run-123', revoked: true, idempotent: true });
    expect(mocks.suspend).not.toHaveBeenCalled();
  });

  it('inspects a disposable site without exposing secrets or mutating it', async () => {
    const mongoRow = { agentId: 'cms-verification-run-123', ownerId: 'user-taz', status: 'draft', activeVibeRevisionId: 'revision-one', provisioningAudit: [{ action: 'cms.test-site.seeded', actor: 'cms-test-seed:user-taz', message: 'seeded', occurredAt: '2026-08-31T00:00:00.000Z', status: 'succeeded', source: 'cms-test-seed:run-123' }] };
    mocks.inspectSiteConfigStores.mockResolvedValue({ supabaseRow: null, mongoRow, selectedRow: mongoRow, selectedStore: 'mongo' });
    const response = await GET(new NextRequest('https://sunsetpulse.app/api/internal/cms/test-site?runId=run-123&email=taz%40example.com', { headers: { 'x-cms-test-seed-token': 'secret' } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ runId: 'run-123', siteId: 'cms-verification-run-123', ownerUserId: 'user-taz', originalPointer: 'revision-one', currentPointer: 'revision-one', reconciliationRequired: true, correlationId: expect.any(String), elapsedMs: expect.any(Number), stores: { present: true, evidence: { supabase: false, mongo: true } } });
    expect(mocks.suspend).not.toHaveBeenCalled();
  });
});
