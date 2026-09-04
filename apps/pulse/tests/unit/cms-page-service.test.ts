import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pageSave: vi.fn(),
  pageToObject: vi.fn(),
  pageFindOneAndUpdate: vi.fn(),
  pageFindOne: vi.fn(),
  pageFind: vi.fn(),
  pageCountDocuments: vi.fn(),
  revisionSave: vi.fn(),
  revisionToObject: vi.fn(),
  revisionFindOne: vi.fn(),
  withTransaction: vi.fn(),
  endSession: vi.fn(),
}));

vi.mock('mongoose', () => ({
  default: {
    startSession: vi.fn(async () => ({ withTransaction: mocks.withTransaction, endSession: mocks.endSession })),
    Types: { ObjectId: class { toString() { return 'revision-id'; } } },
  },
}));

vi.mock('@/models/CmsPage', () => ({
  default: Object.assign(
    vi.fn(function (this: Record<string, unknown>, values: Record<string, unknown>) {
      Object.assign(this, values);
      this.save = mocks.pageSave;
      this.toObject = mocks.pageToObject;
    }),
    { findOneAndUpdate: mocks.pageFindOneAndUpdate, findOne: mocks.pageFindOne, find: mocks.pageFind, countDocuments: mocks.pageCountDocuments },
  ),
}));

vi.mock('@/models/CmsPageRevision', () => ({
  default: Object.assign(
    vi.fn(function (this: Record<string, unknown>, values: Record<string, unknown>) {
      Object.assign(this, values);
      this.save = mocks.revisionSave;
      this.toObject = mocks.revisionToObject;
    }),
    { findOne: mocks.revisionFindOne },
  ),
}));

import CmsPage from '@/models/CmsPage';
import {
  createCmsPage,
  buildCmsPageRoutePath,
  hashCmsPageDraft,
  listCmsPages,
  nextCmsPageRevisionNumber,
  publishCmsPageRevision,
  readCmsPagePreview,
  readPublishedCmsPage,
  restoreCmsPage,
  saveCmsPageDraft,
  stableSerializePage,
  trashCmsPage,
} from '@/lib/cms/pages/pageService';
import { cmsPageDraftSchema } from '@/lib/cms/pages/pageSchema';

const draft = cmsPageDraftSchema.parse({
  title: 'About Sunset Pulse',
  slug: 'about',
  blocks: [{ blockId: '276fd207-2f8c-44f1-a958-9cbc641c1e4c', version: 1, type: 'core/paragraph', props: { text: 'Hello.' } }],
});

function leanResult(value: unknown) {
  return { lean: vi.fn().mockResolvedValue(value) };
}

describe('CMS page lifecycle service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pageSave.mockResolvedValue(undefined);
    mocks.pageToObject.mockReturnValue({ pageId: 'page-id' });
    mocks.revisionSave.mockResolvedValue(undefined);
    mocks.revisionToObject.mockReturnValue({ _id: 'revision-id', revisionNumber: 1 });
    mocks.withTransaction.mockImplementation(async (callback: () => Promise<void>) => callback());
  });

  it('hashes equivalent drafts deterministically', () => {
    expect(stableSerializePage({ b: 2, a: 1 })).toBe(stableSerializePage({ a: 1, b: 2 }));
    expect(hashCmsPageDraft(draft)).toBe(hashCmsPageDraft({ ...draft, blocks: [...draft.blocks] }));
  });

  it('increments immutable revision numbers', () => {
    expect(nextCmsPageRevisionNumber()).toBe(1);
    expect(nextCmsPageRevisionNumber(7)).toBe(8);
  });

  it('builds route paths from stable parent identity', () => {
    expect(buildCmsPageRoutePath('team')).toBe('team');
    expect(buildCmsPageRoutePath('team', 'about')).toBe('about/team');
    expect(() => buildCmsPageRoutePath('nine', 'one/two/three/four/five/six/seven/eight')).toThrow('CMS_PAGE_PATH_INVALID');
  });

  it('lists only pages in the requested tenant and site with bounded pagination', async () => {
    const lean = vi.fn().mockResolvedValue([{ pageId: 'page-id' }]);
    const limit = vi.fn().mockReturnValue({ lean });
    const skip = vi.fn().mockReturnValue({ limit });
    const sort = vi.fn().mockReturnValue({ skip });
    const select = vi.fn().mockReturnValue({ sort });
    mocks.pageFind.mockReturnValue({ select });
    mocks.pageCountDocuments.mockResolvedValue(101);

    await expect(listCmsPages({ tenantId: 'tenant', siteId: 'site', status: 'draft', search: 'About.', page: 2, pageSize: 500 }))
      .resolves.toMatchObject({ page: 2, pageSize: 100, total: 101, totalPages: 2 });
    expect(mocks.pageFind).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant', siteId: 'site', status: 'draft' }));
    expect(skip).toHaveBeenCalledWith(100);
    expect(limit).toHaveBeenCalledWith(100);
  });

  it('reads preview content from the mutable draft payload', async () => {
    mocks.pageFindOne.mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ pageId: 'page-id', status: 'draft', draftPayload: draft }) }),
    });
    await expect(readCmsPagePreview({ tenantId: 'tenant', siteId: 'site', pageId: 'page-id' }))
      .resolves.toMatchObject({ status: 'draft', draftPayload: draft });
    expect(mocks.pageFindOne).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant', siteId: 'site' }));
  });

  it('reads public content only through the pinned published revision', async () => {
    mocks.pageFindOne.mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ pageId: 'page-id', slug: 'about', publishedRevisionId: 'revision-id' }) }),
    });
    mocks.revisionFindOne.mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'revision-id', revisionNumber: 2, snapshot: draft }) }),
    });
    await expect(readPublishedCmsPage({ tenantId: 'tenant', siteId: 'site', slug: 'about' }))
      .resolves.toMatchObject({ _id: 'revision-id', snapshot: draft });
    expect(mocks.revisionFindOne).toHaveBeenCalledWith(expect.objectContaining({ _id: 'revision-id', tenantId: 'tenant', siteId: 'site' }));
  });

  it('creates a normalized draft page', async () => {
    await expect(createCmsPage({ tenantId: 'tenant', siteId: 'site', title: ' About ', slug: 'ABOUT', actorId: 'actor', pageId: 'page-id' }))
      .resolves.toEqual({ pageId: 'page-id' });
    expect(CmsPage).toHaveBeenCalledWith(expect.objectContaining({ title: 'About', slug: 'about', status: 'draft', currentDraftVersion: 0 }));
    expect(mocks.pageSave).toHaveBeenCalledOnce();
  });

  it('creates a child beneath an existing non-trashed parent', async () => {
    mocks.pageFindOne.mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ pageId: 'parent-id', slug: 'about', routePath: 'about' }) }) });
    await createCmsPage({ tenantId: 'tenant', siteId: 'site', title: 'Team', slug: 'team', actorId: 'actor', pageId: 'child-id', parentPageId: 'parent-id' });
    expect(CmsPage).toHaveBeenCalledWith(expect.objectContaining({ parentPageId: 'parent-id', routePath: 'about/team' }));
  });

  it('saves a draft with optimistic concurrency and retains the live pointer', async () => {
    mocks.pageFindOneAndUpdate.mockReturnValue(leanResult({ pageId: 'page-id', currentDraftVersion: 4 }));
    await saveCmsPageDraft({ tenantId: 'tenant', siteId: 'site', pageId: 'page-id', draft, actorId: 'actor', expectedVersion: 3 });
    expect(mocks.pageFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant', siteId: 'site', pageId: 'page-id', currentDraftVersion: 3 }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'draft', draftPayload: draft }), $inc: { currentDraftVersion: 1 } }),
      { new: true, runValidators: true },
    );
    const update = mocks.pageFindOneAndUpdate.mock.calls[0][1];
    expect(update.$unset).toBeUndefined();
    expect(update.$set.publishedRevisionId).toBeUndefined();
  });

  it('reports a stale draft as a conflict', async () => {
    mocks.pageFindOneAndUpdate.mockReturnValue(leanResult(null));
    mocks.pageFindOne.mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ slug: 'about' }) }) });
    await expect(saveCmsPageDraft({ tenantId: 'tenant', siteId: 'site', pageId: 'page-id', draft, actorId: 'actor', expectedVersion: 2 }))
      .rejects.toThrow('CMS_PAGE_DRAFT_CONFLICT');
  });

  it('requires the hierarchy move operation for slug changes', async () => {
    mocks.pageFindOneAndUpdate.mockReturnValue(leanResult(null));
    mocks.pageFindOne.mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ slug: 'original' }) }) });
    await expect(saveCmsPageDraft({ tenantId: 'tenant', siteId: 'site', pageId: 'page-id', draft, actorId: 'actor' }))
      .rejects.toThrow('CMS_PAGE_PATH_CHANGE_REQUIRES_MOVE');
  });

  it('publishes the current draft as an immutable revision in one transaction', async () => {
    const page = { draftPayload: draft, status: 'draft', save: vi.fn().mockResolvedValue(undefined) };
    mocks.pageFindOne.mockReturnValue({ session: vi.fn().mockResolvedValue(page) });
    mocks.revisionFindOne.mockReturnValue({
      sort: vi.fn().mockReturnValue({ session: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) }),
    });

    await expect(publishCmsPageRevision({ tenantId: 'tenant', siteId: 'site', pageId: 'page-id', actorId: 'actor', expectedVersion: 3 }))
      .resolves.toEqual({ _id: 'revision-id', revisionNumber: 1 });
    expect(mocks.pageFindOne).toHaveBeenCalledWith(expect.objectContaining({ currentDraftVersion: 3 }));
    expect(mocks.revisionSave).toHaveBeenCalledWith(expect.objectContaining({ session: expect.anything() }));
    expect(page).toMatchObject({ status: 'published', publishedRevisionId: 'revision-id', updatedBy: 'actor' });
    expect(page.save).toHaveBeenCalledWith(expect.objectContaining({ session: expect.anything() }));
    expect(mocks.endSession).toHaveBeenCalledOnce();
  });

  it('moves pages to trash without erasing their published revision', async () => {
    mocks.pageFindOneAndUpdate.mockReturnValue(leanResult({ status: 'trash' }));
    await trashCmsPage({ tenantId: 'tenant', siteId: 'site', pageId: 'page-id', actorId: 'actor' });
    const update = mocks.pageFindOneAndUpdate.mock.calls[0][1];
    expect(update.$set.status).toBe('trash');
    expect(update.$unset).toBeUndefined();
  });

  it('restores trashed pages as drafts and clears the trash timestamp', async () => {
    mocks.pageFindOneAndUpdate.mockReturnValue(leanResult({ status: 'draft' }));
    await restoreCmsPage({ tenantId: 'tenant', siteId: 'site', pageId: 'page-id', actorId: 'actor' });
    expect(mocks.pageFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'trash' }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'draft' }), $unset: { trashedAt: 1 } }),
      { new: true },
    );
  });
});
