import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ inspect: vi.fn(), cleanup: vi.fn(), jobs: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: {} }));
vi.mock('@/lib/storage/projectStorageMaintenance.mjs', () => ({ inspectProjectStorage: mocks.inspect }));
vi.mock('@/lib/scans/scanUpload.server', () => ({ reconcileScanUploadReservations: mocks.cleanup }));
vi.mock('@/lib/autonomous-workflows/durableScheduler.server', () => ({ processQueuedWorkflowJobs: mocks.jobs }));
import { GET } from '@/app/api/admin/automations/hotlist-email/worker/route';

describe('existing five-minute worker storage maintenance', () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubEnv('CRON_SECRET', 'fixture-secret');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.inspect.mockResolvedValue({ status: 'healthy', backgroundUploadsAllowed: true, reasons: [], metrics: null });
    mocks.cleanup.mockResolvedValue({ inspected: 2, removed: 1, failed: 0 });
    mocks.jobs.mockResolvedValue({ processed: 1, results: [{ status: 'sent' }] });
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
  const request = (secret = 'fixture-secret') => new NextRequest('http://localhost/api/admin/automations/hotlist-email/worker', { headers: { authorization: `Bearer ${secret}` } });

  it.each(['missing', 'incorrect'])('rejects %s cron credentials before inspecting or processing', async (kind) => {
    if (kind === 'missing') vi.stubEnv('CRON_SECRET', '');
    expect((await GET(request('wrong'))).status).toBe(kind === 'missing' ? 503 : 401);
    expect(mocks.inspect).not.toHaveBeenCalled(); expect(mocks.cleanup).not.toHaveBeenCalled(); expect(mocks.jobs).not.toHaveBeenCalled();
  });
  it('returns storage health alongside the existing cleanup and job results', async () => {
    const response = await GET(request());
    expect(await response.json()).toMatchObject({ ok: true, storageMaintenance: { status: 'healthy' }, uploadCleanup: { removed: 1 }, processed: 1 });
    expect(mocks.cleanup).toHaveBeenCalledWith(50);
    expect(console.warn).not.toHaveBeenCalled();
  });
  it.each(['blocked', 'unavailable'])('continues safe cleanup and seller jobs when storage is %s', async (status) => {
    mocks.inspect.mockResolvedValue({ status, backgroundUploadsAllowed: false, reasons: ['capacity_unverified'], metrics: null });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect((await response.json()).storageMaintenance.status).toBe(status);
    expect(mocks.cleanup).toHaveBeenCalledOnce(); expect(mocks.jobs).toHaveBeenCalledOnce();
  });
});
