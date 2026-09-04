import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
  readPreview: vi.fn(),
  saveDraft: vi.fn(),
  publish: vi.fn(),
  trash: vi.fn(),
  restore: vi.fn(),
}));

vi.mock('@/lib/core/database', () => ({ default: mocks.connectDB }));
vi.mock('@/lib/core/routeAuth', () => ({
  requireOperatorRouteAccess: vi.fn(async () => ({ allowed: true, mode: 'authenticated', user: { id: 'operator-id' } })),
  isAuthResponse: vi.fn(() => false),
  operatorAuditUser: vi.fn(() => ({ userId: 'operator-id' })),
}));
vi.mock('@/lib/cms/pages/pageService', () => ({
  createCmsPage: mocks.create,
  listCmsPages: mocks.list,
  readCmsPagePreview: mocks.readPreview,
  saveCmsPageDraft: mocks.saveDraft,
  publishCmsPageRevision: mocks.publish,
  trashCmsPage: mocks.trash,
  restoreCmsPage: mocks.restore,
}));

import { GET as listPages, POST as createPage } from '@/app/api/vibes/pages/route';
import { GET as getPage, PATCH as updatePage } from '@/app/api/vibes/pages/[pageId]/route';
import { GET as previewPage } from '@/app/api/vibes/pages/[pageId]/preview/route';
import { POST as publishPage } from '@/app/api/vibes/pages/[pageId]/publish/route';
import { POST as trashPage } from '@/app/api/vibes/pages/[pageId]/trash/route';
import { POST as restorePage } from '@/app/api/vibes/pages/[pageId]/restore/route';

const context = { params: Promise.resolve({ pageId: 'page-id' }) };
const draft = { schemaVersion: 1, title: 'About', slug: 'about', excerpt: '', templateId: 'sunset/page', blocks: [] };

describe('CMS page routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires an explicit site scope', async () => {
    const response = await listPages(new NextRequest('http://localhost/api/vibes/pages'));
    expect(response.status).toBe(400);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('lists pages with bounded pagination and filters', async () => {
    mocks.list.mockResolvedValue({ pages: [], page: 2, pageSize: 100, total: 0, totalPages: 0 });
    const response = await listPages(new NextRequest('http://localhost/api/vibes/pages?siteId=site-a&tenantId=tenant-a&status=draft&page=2&pageSize=500&search=About'));
    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith({ tenantId: 'tenant-a', siteId: 'site-a', status: 'draft', page: 2, pageSize: 100, search: 'About' });
  });

  it('creates a normalized page identity for the current operator', async () => {
    mocks.create.mockResolvedValue({ pageId: 'page-id' });
    const response = await createPage(new NextRequest('http://localhost/api/vibes/pages?siteId=site-a', { method: 'POST', body: JSON.stringify({ title: 'About', slug: 'about' }) }));
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'default', siteId: 'site-a', actorId: 'operator-id' }));
  });

  it('returns the mutable page draft for editing and preview', async () => {
    mocks.readPreview.mockResolvedValue({ pageId: 'page-id', draftPayload: draft });
    const request = new NextRequest('http://localhost/api/vibes/pages/page-id?siteId=site-a');
    expect((await getPage(request, context)).status).toBe(200);
    expect((await previewPage(new NextRequest('http://localhost/api/vibes/pages/page-id/preview?siteId=site-a'), context)).status).toBe(200);
    expect(mocks.readPreview).toHaveBeenCalledWith({ tenantId: 'default', siteId: 'site-a', pageId: 'page-id' });
  });

  it('maps stale draft saves to a conflict response', async () => {
    mocks.saveDraft.mockRejectedValue(new Error('CMS_PAGE_DRAFT_CONFLICT'));
    const response = await updatePage(new NextRequest('http://localhost/api/vibes/pages/page-id?siteId=site-a', {
      method: 'PATCH', body: JSON.stringify({ draft, expectedVersion: 4 }),
    }), context);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'CMS_PAGE_DRAFT_CONFLICT' });
  });

  it('publishes the expected draft version', async () => {
    mocks.publish.mockResolvedValue({ _id: 'revision-id', revisionNumber: 1 });
    const response = await publishPage(new NextRequest('http://localhost/api/vibes/pages/page-id/publish?siteId=site-a', {
      method: 'POST', body: JSON.stringify({ expectedVersion: 4, changeSummary: 'Initial page' }),
    }), context);
    expect(response.status).toBe(201);
    expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({ pageId: 'page-id', siteId: 'site-a', expectedVersion: 4, actorId: 'operator-id' }));
  });

  it('supports reversible trash transitions', async () => {
    mocks.trash.mockResolvedValue({ pageId: 'page-id', status: 'trash' });
    mocks.restore.mockResolvedValue({ pageId: 'page-id', status: 'draft' });
    const trashed = await trashPage(new NextRequest('http://localhost/api/vibes/pages/page-id/trash?siteId=site-a', { method: 'POST' }), context);
    const restored = await restorePage(new NextRequest('http://localhost/api/vibes/pages/page-id/restore?siteId=site-a', { method: 'POST' }), context);
    expect(trashed.status).toBe(200);
    expect(restored.status).toBe(200);
    expect(mocks.trash).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'operator-id' }));
    expect(mocks.restore).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'operator-id' }));
  });
});
