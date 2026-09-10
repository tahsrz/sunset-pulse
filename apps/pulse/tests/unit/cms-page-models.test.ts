import { describe, expect, it } from 'vitest';
import CmsPage from '@/models/CmsPage';
import CmsPageRevision from '@/models/CmsPageRevision';

describe('CMS page persistence models', () => {
  it('enforces stable page IDs and site-scoped hierarchical paths', () => {
    const indexes = (CmsPage as any).schema.indexes();
    expect(indexes).toContainEqual([{ tenantId: 1, pageId: 1 }, expect.objectContaining({ unique: true })]);
    expect(indexes).toContainEqual([{ tenantId: 1, siteId: 1, routePath: 1 }, expect.objectContaining({ unique: true, sparse: true })]);
    expect(indexes).toContainEqual([{ tenantId: 1, siteId: 1, parentPageId: 1, slug: 1 }, expect.anything()]);
  });

  it('enforces ordered immutable revision identities', () => {
    const indexes = (CmsPageRevision as any).schema.indexes();
    expect(indexes).toContainEqual([{ tenantId: 1, pageId: 1, revisionNumber: -1 }, expect.objectContaining({ unique: true })]);
    expect((CmsPageRevision as any).schema.path('snapshot').options.immutable).toBe(true);
    expect((CmsPageRevision as any).schema.path('contentHash').options.immutable).toBe(true);
  });
});
