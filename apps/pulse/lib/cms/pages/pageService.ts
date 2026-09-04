import crypto from 'node:crypto';
import mongoose from 'mongoose';
import CmsPage from '@/models/CmsPage';
import CmsPageRevision from '@/models/CmsPageRevision';
import { cmsPageDraftSchema, type CmsPageDraft } from './pageSchema';

export function stableSerializePage(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerializePage).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableSerializePage(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function hashCmsPageDraft(draft: CmsPageDraft): string {
  return crypto.createHash('sha256').update(stableSerializePage(draft)).digest('hex');
}

export function nextCmsPageRevisionNumber(previousRevisionNumber?: number): number {
  return (previousRevisionNumber || 0) + 1;
}

export async function listCmsPages(input: {
  tenantId: string;
  siteId: string;
  status?: 'draft' | 'published' | 'trash';
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page || 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize || 25));
  const filter: Record<string, unknown> = { tenantId: input.tenantId, siteId: input.siteId };
  if (input.status) filter.status = input.status;
  if (input.search) {
    const search = input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ title: { $regex: search, $options: 'i' } }, { slug: { $regex: search, $options: 'i' } }, { routePath: { $regex: search, $options: 'i' } }];
  }
  const [pages, total] = await Promise.all([
    CmsPage.find(filter)
      .select('pageId siteId title slug parentPageId routePath status authorId updatedBy currentDraftVersion publishedRevisionId trashedAt createdAt updatedAt')
      .sort({ updatedAt: -1, pageId: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    CmsPage.countDocuments(filter),
  ]);
  return { pages, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

export async function readCmsPagePreview(input: { tenantId: string; siteId: string; pageId: string }) {
  const page = await CmsPage.findOne({
    tenantId: input.tenantId,
    siteId: input.siteId,
    pageId: input.pageId,
    status: { $in: ['draft', 'published'] },
  }).select('pageId siteId parentPageId routePath status currentDraftVersion draftPayload publishedRevisionId').lean() as any;
  if (!page) return null;
  return { ...page, draftPayload: cmsPageDraftSchema.parse(page.draftPayload) };
}

export async function readPublishedCmsPage(input: { tenantId: string; siteId: string; pageId?: string; routePath?: string; slug?: string }) {
  const pageFilter: Record<string, unknown> = { tenantId: input.tenantId, siteId: input.siteId, status: 'published' };
  if (input.pageId) pageFilter.pageId = input.pageId;
  else if (input.routePath) pageFilter.$or = [{ routePath: input.routePath }, ...(input.routePath.includes('/') ? [] : [{ routePath: { $exists: false }, slug: input.routePath }])];
  else if (input.slug) pageFilter.$or = [{ routePath: input.slug }, { routePath: { $exists: false }, slug: input.slug }];
  else throw new Error('CMS_PAGE_IDENTIFIER_REQUIRED');
  const page = await CmsPage.findOne(pageFilter).select('pageId siteId slug routePath publishedRevisionId').lean() as any;
  if (!page?.publishedRevisionId) return null;
  const revision = await CmsPageRevision.findOne({
    _id: page.publishedRevisionId,
    tenantId: input.tenantId,
    siteId: input.siteId,
    pageId: page.pageId,
    publishedAt: { $exists: true, $ne: null },
  }).select('_id pageId revisionNumber snapshot schemaVersion contentHash publishedAt').lean() as any;
  if (!revision) return null;
  return { ...revision, routePath: page.routePath || page.slug, snapshot: cmsPageDraftSchema.parse(revision.snapshot) };
}

export function buildCmsPageRoutePath(slug: string, parentRoutePath?: string) {
  const routePath = parentRoutePath ? `${parentRoutePath}/${slug}` : slug;
  const segments = routePath.split('/');
  if (routePath.length > 500 || segments.length > 8 || segments.some((segment) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(segment))) {
    throw new Error('CMS_PAGE_PATH_INVALID');
  }
  return routePath;
}

export async function createCmsPage(input: {
  tenantId: string;
  siteId: string;
  title: string;
  slug: string;
  actorId: string;
  pageId?: string;
  parentPageId?: string;
}) {
  const draft = cmsPageDraftSchema.parse({ title: input.title, slug: input.slug });
  let parentRoutePath: string | undefined;
  if (input.parentPageId) {
    const parent = await CmsPage.findOne({ tenantId: input.tenantId, siteId: input.siteId, pageId: input.parentPageId, status: { $ne: 'trash' } })
      .select('pageId slug routePath').lean() as any;
    if (!parent) throw new Error('CMS_PAGE_PARENT_NOT_FOUND');
    parentRoutePath = parent.routePath || parent.slug;
    if (parentRoutePath === 'home') throw new Error('CMS_PAGE_HOME_CANNOT_BE_PARENT');
  }
  const page = new CmsPage({
    tenantId: input.tenantId,
    siteId: input.siteId,
    pageId: input.pageId || crypto.randomUUID(),
    title: draft.title,
    slug: draft.slug,
    parentPageId: input.parentPageId,
    routePath: buildCmsPageRoutePath(draft.slug, parentRoutePath),
    status: 'draft',
    authorId: input.actorId,
    updatedBy: input.actorId,
    currentDraftVersion: 0,
    draftPayload: draft,
  });
  await page.save();
  return page.toObject();
}

export async function saveCmsPageDraft(input: {
  tenantId: string;
  siteId: string;
  pageId: string;
  draft: CmsPageDraft;
  actorId: string;
  expectedVersion?: number;
}) {
  const draft = cmsPageDraftSchema.parse(input.draft);
  const filter: Record<string, unknown> = {
    tenantId: input.tenantId,
    siteId: input.siteId,
    pageId: input.pageId,
    slug: draft.slug,
    status: { $in: ['draft', 'published'] },
  };
  if (input.expectedVersion !== undefined) filter.currentDraftVersion = input.expectedVersion;

  const updated = await CmsPage.findOneAndUpdate(filter, {
    $set: {
      title: draft.title,
      slug: draft.slug,
      draftPayload: draft,
      updatedBy: input.actorId,
      updatedAt: new Date(),
      status: 'draft',
    },
    $inc: { currentDraftVersion: 1 },
  }, { new: true, runValidators: true }).lean();

  if (!updated) {
    const existing = await CmsPage.findOne({ tenantId: input.tenantId, siteId: input.siteId, pageId: input.pageId }).select('slug').lean() as any;
    if (existing && existing.slug !== draft.slug) throw new Error('CMS_PAGE_PATH_CHANGE_REQUIRES_MOVE');
    throw new Error(input.expectedVersion === undefined ? 'CMS_PAGE_NOT_FOUND' : 'CMS_PAGE_DRAFT_CONFLICT');
  }
  return updated;
}

export async function publishCmsPageRevision(input: {
  tenantId: string;
  siteId: string;
  pageId: string;
  actorId: string;
  expectedVersion?: number;
  changeSummary?: string;
}) {
  const session = await mongoose.startSession();
  try {
    let published;
    await session.withTransaction(async () => {
      const filter: Record<string, unknown> = {
        tenantId: input.tenantId,
        siteId: input.siteId,
        pageId: input.pageId,
        status: { $in: ['draft', 'published'] },
      };
      if (input.expectedVersion !== undefined) filter.currentDraftVersion = input.expectedVersion;
      const page = await CmsPage.findOne(filter).session(session);
      if (!page) throw new Error(input.expectedVersion === undefined ? 'CMS_PAGE_NOT_FOUND' : 'CMS_PAGE_DRAFT_CONFLICT');

      const snapshot = cmsPageDraftSchema.parse(page.draftPayload);
      const previous = await CmsPageRevision.findOne({ tenantId: input.tenantId, pageId: input.pageId })
        .sort({ revisionNumber: -1 }).session(session).lean() as { _id?: unknown; revisionNumber?: number } | null;
      const revisionId = new mongoose.Types.ObjectId().toString();
      const revision = new CmsPageRevision({
        _id: revisionId,
        tenantId: input.tenantId,
        siteId: input.siteId,
        pageId: input.pageId,
        revisionNumber: nextCmsPageRevisionNumber(previous?.revisionNumber),
        snapshot,
        schemaVersion: snapshot.schemaVersion,
        contentHash: hashCmsPageDraft(snapshot),
        parentRevisionId: previous?._id ? String(previous._id) : undefined,
        changeSummary: input.changeSummary || '',
        createdBy: input.actorId,
        publishedAt: new Date(),
        publishedBy: input.actorId,
      });
      await revision.save({ session });
      page.publishedRevisionId = revisionId;
      page.status = 'published';
      page.updatedBy = input.actorId;
      page.updatedAt = new Date();
      await page.save({ session });
      published = revision.toObject();
    });
    return published;
  } finally {
    await session.endSession();
  }
}

export async function trashCmsPage(input: { tenantId: string; siteId: string; pageId: string; actorId: string }) {
  const page = await CmsPage.findOneAndUpdate({
    tenantId: input.tenantId,
    siteId: input.siteId,
    pageId: input.pageId,
    status: { $in: ['draft', 'published'] },
  }, { $set: { status: 'trash', trashedAt: new Date(), updatedBy: input.actorId, updatedAt: new Date() } }, { new: true }).lean();
  if (!page) throw new Error('CMS_PAGE_NOT_FOUND');
  return page;
}

export async function restoreCmsPage(input: { tenantId: string; siteId: string; pageId: string; actorId: string }) {
  const page = await CmsPage.findOneAndUpdate({
    tenantId: input.tenantId,
    siteId: input.siteId,
    pageId: input.pageId,
    status: 'trash',
  }, {
    $set: { status: 'draft', updatedBy: input.actorId, updatedAt: new Date() },
    $unset: { trashedAt: 1 },
  }, { new: true }).lean();
  if (!page) throw new Error('CMS_PAGE_NOT_FOUND');
  return page;
}
