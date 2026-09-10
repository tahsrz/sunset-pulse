import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ read: vi.fn(), update: vi.fn(), site: vi.fn(), page: vi.fn(), publish: vi.fn(), preview: vi.fn() }));
vi.mock('@/models/CmsPlatformHomepage', () => ({ default: { findById: mocks.read, findOneAndUpdate: mocks.update } }));
vi.mock('@/models/SiteConfig', () => ({ SiteConfig: { findOneAndUpdate: mocks.site } }));
vi.mock('@/models/CmsPage', () => ({ default: { findOneAndUpdate: mocks.page } }));
vi.mock('@/lib/cms/pages/pageService', () => ({ publishCmsPageRevision: mocks.publish, readCmsPagePreview: mocks.preview }));

import { disablePlatformHomepage, initializePlatformHomepage, publishPlatformHomepage, readPlatformHomepageEditor } from '@/lib/cms/pages/platformHomepageService';
import { createPlatformHomepageDraft } from '@/lib/cms/pages/platformHomepageDraft';
import { cmsPageDraftSchema } from '@/lib/cms/pages/pageSchema';

const binding = { tenantId: 'platform', siteId: 'dedicated-home', pageId: 'home-page', version: 4, enabled: false };
const scope = { tenantId: binding.tenantId, siteId: binding.siteId, pageId: binding.pageId };
const lean = (value: unknown) => ({ lean: vi.fn().mockResolvedValue(value) });

describe('platform homepage lifecycle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.read.mockReturnValue(lean(binding));
    mocks.update.mockReturnValue(lean(binding));
    mocks.site.mockResolvedValue({}); mocks.page.mockResolvedValue({});
  });

  it('creates bounded editable sections and actual destination links without publishing', () => {
    const draft = createPlatformHomepageDraft('https://jamie.sunsetpulse.app/');
    expect(cmsPageDraftSchema.parse(draft)).toEqual(draft);
    expect(new Set(draft.blocks.map(block => block.blockId)).size).toBe(draft.blocks.length);
    expect(JSON.stringify(draft)).toContain('https://jamie.sunsetpulse.app/');
    expect(JSON.stringify(draft)).not.toContain('#interactive-world');
    expect(mocks.publish).not.toHaveBeenCalled();
  });

  it('resumes insert-only setup in the existing dedicated scope without overwriting operator edits', async () => {
    for (let i = 0; i < 2; i++) {
      await expect(initializePlatformHomepage({ actorId: 'operator', jamieUrl: 'https://jamie.sunsetpulse.app/' })).resolves.toEqual(binding);
    }
    for (const [filter, update] of mocks.page.mock.calls) {
      expect(filter).toEqual(scope);
      expect(Object.keys(update)).toEqual(['$setOnInsert']);
      expect(update.$setOnInsert).toMatchObject({ ...scope, status: 'draft', currentDraftVersion: 0 });
      expect(update.$setOnInsert.publishedRevisionId).toBeUndefined();
    }
    expect(mocks.site).toHaveBeenCalledWith({ agentId: binding.siteId }, expect.objectContaining({ $setOnInsert: expect.objectContaining({ status: 'draft' }) }), expect.anything());
    expect(mocks.publish).not.toHaveBeenCalled();
  });

  it('does not seed anything during a read', async () => {
    mocks.read.mockReturnValue(lean(null));
    await expect(readPlatformHomepageEditor()).resolves.toEqual({ binding: null, page: null });
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.page).not.toHaveBeenCalled();
  });

  it('pins publication using the same transaction session and binding version', async () => {
    const session = { id: 'transaction' };
    mocks.update.mockResolvedValue({ ...binding, enabled: true });
    mocks.publish.mockImplementation(async input => {
      await input.onPublished({ _id: 'immutable-revision' }, session);
      return { _id: 'immutable-revision' };
    });
    await expect(publishPlatformHomepage({ actorId: 'operator', expectedVersion: 7, expectedBindingVersion: 4 })).resolves.toEqual({ _id: 'immutable-revision' });
    expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({ ...scope, expectedVersion: 7 }));
    expect(mocks.update).toHaveBeenCalledWith({ _id: 'main', version: 4 }, {
      $set: { enabled: true, publishedRevisionId: 'immutable-revision', updatedBy: 'operator' }, $inc: { version: 1 },
    }, { session, new: true });
  });

  it('propagates a pointer conflict into the publication transaction', async () => {
    mocks.update.mockResolvedValue(null);
    mocks.publish.mockImplementation(input => input.onPublished({ _id: 'rev' }, {}));
    await expect(publishPlatformHomepage({ actorId: 'operator', expectedVersion: 7, expectedBindingVersion: 3 })).rejects.toThrow('PLATFORM_HOMEPAGE_CONFLICT');
  });

  it('restores the legacy homepage without deleting the draft or published revision', async () => {
    mocks.update.mockResolvedValue(binding);
    await disablePlatformHomepage({ actorId: 'operator', expectedBindingVersion: 4 });
    expect(mocks.update).toHaveBeenCalledWith({ _id: 'main', version: 4 }, {
      $set: { enabled: false, updatedBy: 'operator' }, $inc: { version: 1 },
    }, { new: true });
    expect(mocks.page).not.toHaveBeenCalled();
  });
});
