import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as list, POST as create } from '@/app/api/vibes/route';
import { GET as taxonomy } from '@/app/api/vibes/taxonomy/route';
import { GET as detail, PATCH as update } from '@/app/api/vibes/[vibeId]/route';
import { POST as publish } from '@/app/api/vibes/[vibeId]/publish/route';
import { POST as bulk } from '@/app/api/vibes/bulk/route';
import { GET as legacyList, POST as legacyWrite } from '@/app/api/jamie/vibes/route';

const mocks = vi.hoisted(() => ({
  session: vi.fn(), database: vi.fn(), save: vi.fn(), publish: vi.fn(), audit: vi.fn(),
  find: vi.fn(() => ({
    select: vi.fn().mockReturnThis(), sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue([{ vibeId: 'fixture', status: 'draft' }]),
  })),
  count: vi.fn().mockResolvedValue(1), aggregate: vi.fn().mockResolvedValue([{ _id: 'draft', count: 1 }]),
}));
vi.mock('@/lib/core/getSessionUser', () => ({ getSessionUser: mocks.session }));
vi.mock('@/lib/core/database', () => ({ default: mocks.database }));
vi.mock('@/models/Vibe', () => ({ default: { find: mocks.find, findOne: mocks.find, countDocuments: mocks.count, aggregate: mocks.aggregate } }));
vi.mock('@/models/VibeAuditEvent', () => ({ default: { create: mocks.audit } }));
vi.mock('@/lib/cms/vibeService', () => ({ saveVibeDraft: mocks.save, publishVibeRevision: mocks.publish }));

const originalEnv = { ...process.env };
beforeEach(() => {
  vi.clearAllMocks();mocks.session.mockReset().mockResolvedValue(null);
  (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
  process.env.VIBE_CMS_PUBLIC_WRITE_WIP = 'true';process.env.E2E_OPERATOR_ACCESS = 'true';
  delete process.env.OPERATOR_EMAIL;delete process.env.AUTHORIZED_EMAIL;
});
afterEach(() => { process.env = { ...originalEnv }; });
const context = () => ({ params: Promise.resolve({ vibeId: 'fixture' }) });
const handlers = [
  { method: 'GET', path: '/api/vibes', run: list },
  { method: 'GET', path: '/api/vibes/taxonomy', run: taxonomy },
  { method: 'GET', path: '/api/vibes/fixture', run: (request: NextRequest) => detail(request, context()) },
  { method: 'POST', path: '/api/vibes', run: create },
  { method: 'PATCH', path: '/api/vibes/fixture', run: (request: NextRequest) => update(request, context()) },
  { method: 'POST', path: '/api/vibes/fixture/publish', run: (request: NextRequest) => publish(request, context()) },
  { method: 'POST', path: '/api/vibes/bulk', run: bulk },
  { method: 'GET', path: '/api/jamie/vibes', run: legacyList },
  { method: 'POST', path: '/api/jamie/vibes', run: legacyWrite },
];
function request(method: string, path: string) {
  return new NextRequest('https://sunsetpulse.example.com'+path, { method, headers: { host: 'sunsetpulse.example.com', 'content-type': 'application/json' }, ...(method==='GET'?{}:{body:'null'}) });
}

describe('CMS route authority before data access', () => {
  for (const role of ['anonymous', 'consumer', 'realtor']) {
    it.each(handlers)(`denies ${role}: $method $path before database or editorial effects`, async ({ method, path, run }) => {
      if (role!=='anonymous') mocks.session.mockResolvedValue({ userId: 'fixture', role, user: { email: 'visitor@example.test', role } });
      const response = await run(request(method,path));expect(response.status).toBe(403);
      for (const dependency of [mocks.database,mocks.find,mocks.count,mocks.aggregate,mocks.save,mocks.publish,mocks.audit]) expect(dependency).not.toHaveBeenCalled();
    });
  }
  it.each(['operator', 'admin'])('allows trusted %s collection and taxonomy reads', async (role) => {
    mocks.session.mockResolvedValue({ userId: 'fixture', role, user: { email: 'owner@example.test', role } });
    const response = await list(request('GET','/api/vibes'));expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ vibes: [{ vibeId: 'fixture', status: 'draft' }], total: 1 });
    const terms = await taxonomy(request('GET','/api/vibes/taxonomy'));expect(terms.status).toBe(200);
    expect(await terms.json()).toMatchObject({ counts: { draft: 1 } });
    const legacy = await legacyList(request('GET','/api/jamie/vibes'));expect(legacy.status).toBe(200);
    expect(await legacy.json()).toMatchObject({ vibes: [{ vibeId: 'fixture', status: 'draft' }] });expect(mocks.database).toHaveBeenCalledTimes(3);
  });
  it.each(['operator', 'admin'])('allows trusted %s to reach mutation validation without a write', async (role) => {
    mocks.session.mockResolvedValue({ userId: 'fixture', role, user: { email: 'owner@example.test', role } });
    for (const { method, path, run } of handlers.filter(handler=>handler.method!=='GET')) {
      expect((await run(request(method,path))).status).toBe(400);
    }
    for (const dependency of [mocks.database,mocks.save,mocks.publish,mocks.audit]) expect(dependency).not.toHaveBeenCalled();
  });
});
