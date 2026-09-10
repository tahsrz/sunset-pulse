import crypto from 'node:crypto';
import CmsPlatformHomepage from '@/models/CmsPlatformHomepage';
import CmsPage from '@/models/CmsPage';
import { SiteConfig } from '@/models/SiteConfig';
import { createPlatformHomepageDraft } from './platformHomepageDraft';
import { publishCmsPageRevision, readCmsPagePreview } from './pageService';

export type PlatformHomepageBinding = {
  tenantId: string;
  siteId: string;
  pageId: string;
  enabled: boolean;
  publishedRevisionId?: string;
  version: number;
};

export async function readPlatformHomepageBinding(): Promise<PlatformHomepageBinding | null> {
  return CmsPlatformHomepage.findById(
    'main',
  ).lean() as Promise<PlatformHomepageBinding | null>;
}

/** Each stage is insert-only and repeatable if a previous attempt stopped partway through. */
export async function initializePlatformHomepage(input: {
  actorId: string;
  jamieUrl: string;
}) {
  const identity = crypto.randomUUID();
  const binding = (await CmsPlatformHomepage.findOneAndUpdate(
    { _id: 'main' },
    {
      $setOnInsert: {
        tenantId: 'platform',
        siteId: 'platform-homepage-' + identity,
        pageId: crypto.randomUUID(),
        enabled: false,
        version: 0,
        updatedBy: input.actorId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean()) as unknown as PlatformHomepageBinding;
  await SiteConfig.findOneAndUpdate(
    { agentId: binding.siteId },
    {
      $setOnInsert: {
        agentId: binding.siteId,
        ownerId: input.actorId,
        status: 'draft',
        branding: { siteName: 'Sunset Pulse' },
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
  const draft = createPlatformHomepageDraft(input.jamieUrl);
  await CmsPage.findOneAndUpdate(
    {
      tenantId: binding.tenantId,
      siteId: binding.siteId,
      pageId: binding.pageId,
    },
    {
      $setOnInsert: {
        ...bindingScope(binding),
        title: draft.title,
        slug: 'home',
        routePath: 'home',
        status: 'draft',
        authorId: input.actorId,
        updatedBy: input.actorId,
        currentDraftVersion: 0,
        draftPayload: draft,
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
  return binding;
}

export function bindingScope(binding: PlatformHomepageBinding) {
  return {
    tenantId: binding.tenantId,
    siteId: binding.siteId,
    pageId: binding.pageId,
  };
}

export async function readPlatformHomepageEditor() {
  const binding = await readPlatformHomepageBinding();
  if (!binding) return { binding: null, page: null };
  const page = await readCmsPagePreview(bindingScope(binding));
  return { binding, page };
}

export async function publishPlatformHomepage(input: {
  actorId: string;
  expectedVersion: number;
  expectedBindingVersion: number;
}) {
  const binding = await readPlatformHomepageBinding();
  if (!binding) throw new Error('PLATFORM_HOMEPAGE_NOT_INITIALIZED');
  return publishCmsPageRevision({
    ...bindingScope(binding),
    actorId: input.actorId,
    expectedVersion: input.expectedVersion,
    changeSummary: 'Publish platform homepage',
    onPublished: async (revision, session) => {
      const updated = await CmsPlatformHomepage.findOneAndUpdate(
        {
          _id: 'main',
          version: input.expectedBindingVersion,
        },
        {
          $set: {
            enabled: true,
            publishedRevisionId: String(revision._id),
            updatedBy: input.actorId,
          },
          $inc: { version: 1 },
        },
        { session, new: true },
      );
      if (!updated) throw new Error('PLATFORM_HOMEPAGE_CONFLICT');
    },
  });
}

export async function disablePlatformHomepage(input: {
  actorId: string;
  expectedBindingVersion: number;
}) {
  const updated = await CmsPlatformHomepage.findOneAndUpdate(
    { _id: 'main', version: input.expectedBindingVersion },
    {
      $set: { enabled: false, updatedBy: input.actorId },
      $inc: { version: 1 },
    },
    { new: true },
  );
  if (!updated) throw new Error('PLATFORM_HOMEPAGE_CONFLICT');
  return updated;
}
