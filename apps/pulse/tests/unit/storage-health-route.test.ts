import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ inspect: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: {} }));
vi.mock('@/lib/storage/projectStorageMaintenance.mjs', () => ({ inspectProjectStorage: mocks.inspect }));
import { GET } from '@/app/api/admin/storage/health/route';
const ref = 'xlyfhiafactxahhvikyv';
const request = (secret = 'fixture-secret', expected = ref) => new NextRequest(`http://localhost/api/admin/storage/health?expectedProjectRef=${expected}`, { headers: { authorization: `Bearer ${secret}` } });

describe('read-only deployment storage health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CRON_SECRET', 'fixture-secret');
    vi.stubEnv('SUPABASE_URL', `https://${ref}.supabase.co`);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', `https://${ref}.supabase.co`);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'private-fixture-service-key');
    mocks.inspect.mockResolvedValue({ status: 'healthy', backgroundUploadsAllowed: true, reasons: [], metrics: { liveBytes: 362399 } });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
  it.each(['missing', 'incorrect'])('rejects %s machine credentials before inspecting', async (kind) => {
    if (kind === 'missing') vi.stubEnv('CRON_SECRET', '');
    expect((await GET(request('wrong'))).status).toBe(kind === 'missing' ? 503 : 401);
    expect(mocks.inspect).not.toHaveBeenCalled();
  });
  it('returns only the selected target and aggregate health, without secrets', async () => {
    const response = await GET(request());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toMatchObject({ ok: true, target: { projectRef: ref }, storage: { status: 'healthy' } });
    expect(JSON.stringify(body)).not.toContain('private-fixture');
    expect(JSON.stringify(body)).not.toContain('fixture-secret');
    expect(mocks.inspect).toHaveBeenCalledOnce();
  });
  it('refuses a different deployed target before making a database request', async () => {
    expect((await GET(request('fixture-secret', 'abcdefghijklmnopqrst'))).status).toBe(409);
    expect(mocks.inspect).not.toHaveBeenCalled();
  });
  it('refuses stale browser configuration and origins containing credentials', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abcdefghijklmnopqrst.supabase.co');
    expect((await GET(request())).status).toBe(409);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', `https://${ref}.supabase.co`);
    vi.stubEnv('SUPABASE_URL', `https://private:password@${ref}.supabase.co`);
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('password');
    expect(mocks.inspect).not.toHaveBeenCalled();
  });
  it('requires an explicit target and a server-only inspection credential', async () => {
    expect((await GET(request('fixture-secret', ''))).status).toBe(400);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect((await GET(request())).status).toBe(503);
    expect(mocks.inspect).not.toHaveBeenCalled();
  });
  it('reports unavailable capacity without invoking any workflow or cleanup', async () => {
    mocks.inspect.mockResolvedValue({ status: 'unavailable', backgroundUploadsAllowed: false, reasons: ['capacity_unverified'], metrics: null });
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect((await response.json()).storage.status).toBe('unavailable');
  });
});
