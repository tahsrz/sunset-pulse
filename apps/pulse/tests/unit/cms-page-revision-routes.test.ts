import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ list: vi.fn(), restore: vi.fn() }));
vi.mock('@/lib/core/database', () => ({ default: vi.fn() }));
vi.mock('@/lib/core/routeAuth', () => ({ requireOperatorRouteAccess: vi.fn(async () => ({ allowed: true })), isAuthResponse: vi.fn(() => false), operatorAuditUser: vi.fn(() => ({ userId: 'operator' })) }));
vi.mock('@/lib/cms/pages/pageService', () => ({ listCmsPageRevisions: mocks.list, restoreCmsPageRevision: mocks.restore }));

import { GET, POST } from '@/app/api/vibes/pages/[pageId]/revisions/route';
const context = { params: Promise.resolve({ pageId: 'page-1' }) };

describe('CMS page revision routes', () => {
  beforeEach(() => vi.clearAllMocks());
  it('lists bounded history in the requested site scope', async () => {
    mocks.list.mockResolvedValue([{ _id: 'revision-1', revisionNumber: 1 }]);
    const response = await GET(new NextRequest('http://localhost/api/vibes/pages/page-1/revisions?siteId=site-a&limit=10'), context);
    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith({ tenantId: 'default', siteId: 'site-a', pageId: 'page-1', limit: 10 });
  });
  it('restores a revision with optimistic concurrency', async () => {
    mocks.restore.mockResolvedValue({ currentDraftVersion: 5, status: 'draft' });
    const response = await POST(new NextRequest('http://localhost/api/vibes/pages/page-1/revisions?siteId=site-a', { method: 'POST', body: JSON.stringify({ revisionId: 'revision-1', expectedVersion: 4 }) }), context);
    expect(response.status).toBe(200);
    expect(mocks.restore).toHaveBeenCalledWith(expect.objectContaining({ revisionId: 'revision-1', expectedVersion: 4, actorId: 'operator' }));
  });
  it('maps a stale restore to conflict', async () => {
    mocks.restore.mockRejectedValue(new Error('CMS_PAGE_DRAFT_CONFLICT'));
    const response = await POST(new NextRequest('http://localhost/api/vibes/pages/page-1/revisions?siteId=site-a', { method: 'POST', body: JSON.stringify({ revisionId: 'revision-1', expectedVersion: 4 }) }), context);
    expect(response.status).toBe(409);
  });
});
