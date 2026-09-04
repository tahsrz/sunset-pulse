import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readPublishedPage: vi.fn(),
  siteFindOne: vi.fn(),
  themeFindOne: vi.fn(),
  pluginFind: vi.fn(),
  vibeFindOne: vi.fn(),
}));

vi.mock('@/lib/cms/pages/pageService', () => ({ readPublishedCmsPage: mocks.readPublishedPage }));
vi.mock('@/models/SiteConfig', () => ({ SiteConfig: { findOne: mocks.siteFindOne } }));
vi.mock('@/models/SiteThemeActivation', () => ({ default: { findOne: mocks.themeFindOne } }));
vi.mock('@/models/SitePluginActivation', () => ({ default: { find: mocks.pluginFind } }));
vi.mock('@/models/VibeRevision', () => ({ default: { findOne: mocks.vibeFindOne } }));

import { createExtensionCatalog, bundledExtensionCatalog, DEFAULT_CMS_THEME_ID } from '@/lib/cms/extensions/catalog';
import { buildCmsPageRenderContext, resolveCmsPageRenderContext } from '@/lib/cms/pages/renderContext';
import type { TenantContext } from '@/lib/tenancy/contracts';

const tenantContext = {
  requestId: 'request-id',
  domain: { hostname: 'agent.sunsetpulse.com', environment: 'production', domainId: 'domain-id', kind: 'platform_subdomain', status: 'active', tenantId: 'tenant-id', revision: 1, verifiedAt: null },
  identity: { tenantId: 'tenant-id', agentId: 'site-id', siteConfigId: 'tenant-id', slug: 'agent', ownerId: 'owner-id' },
  publication: { status: 'active', reviewStatus: 'approved', billingState: 'active', mayRenderPublicly: true, reason: '', effectiveUntil: null, revision: 1 },
  source: 'host',
  resolvedAt: '2026-09-04T00:00:00.000Z',
} as TenantContext;

function selected(value: unknown) {
  return { select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(value) }) };
}

describe('CMS page rendering context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readPublishedPage.mockResolvedValue({ pageId: 'page-id', snapshot: { title: 'About', slug: 'about', blocks: [] } });
    mocks.siteFindOne.mockReturnValue(selected({ agentId: 'site-id', activeVibeRevisionId: 'vibe-revision-id' }));
    mocks.themeFindOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    mocks.pluginFind.mockReturnValue({ sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) });
    mocks.vibeFindOne.mockReturnValue(selected({ _id: 'vibe-revision-id', vibeId: 'vibe-id', revisionNumber: 3, cssVars: { '--color-primary': '#123456' } }));
  });

  it('composes the published page, default theme, and pinned Vibe for the resolved site', async () => {
    const context = await buildCmsPageRenderContext({ tenantContext, slug: 'about' });
    expect(context).toMatchObject({
      requestId: 'request-id', tenantId: 'tenant-id', siteId: 'site-id', hostname: 'agent.sunsetpulse.com',
      theme: { id: DEFAULT_CMS_THEME_ID },
      vibe: { revisionId: 'vibe-revision-id', revisionNumber: 3 },
      diagnostics: [],
    });
    expect(mocks.readPublishedPage).toHaveBeenCalledWith({ tenantId: 'tenant-id', siteId: 'site-id', slug: 'about' });
  });

  it('loads only active, bundled plugins and reports unavailable activations', async () => {
    const plugin = { id: 'sunset/contact-form', name: 'Contact Form', version: '1.0.0', description: 'Contact form.', author: 'Sunset Pulse', extensions: {} };
    const catalog = createExtensionCatalog({ plugins: [plugin], themes: bundledExtensionCatalog.themes });
    mocks.pluginFind.mockReturnValue({ sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([
      { pluginId: plugin.id, version: '0.9.0', settings: { recipient: 'agent@example.com' } },
      { pluginId: 'missing/plugin', version: '1.0.0', settings: {} },
    ]) }) });
    const context = await buildCmsPageRenderContext({ tenantContext, slug: 'about', catalog });
    expect(context?.plugins).toHaveLength(1);
    expect(context?.plugins[0]).toMatchObject({ manifest: { id: plugin.id }, settings: { recipient: 'agent@example.com' } });
    expect(context?.diagnostics).toEqual([
      `ACTIVE_PLUGIN_VERSION_MISMATCH:${plugin.id}`,
      'ACTIVE_PLUGIN_UNAVAILABLE:missing/plugin',
    ]);
  });

  it('falls back to the core theme and reports a missing selected theme', async () => {
    mocks.themeFindOne.mockReturnValue({ lean: vi.fn().mockResolvedValue({ themeId: 'missing/theme', version: '1.0.0' }) });
    const context = await buildCmsPageRenderContext({ tenantContext, slug: 'about' });
    expect(context?.theme.id).toBe(DEFAULT_CMS_THEME_ID);
    expect(context?.diagnostics).toContain('ACTIVE_THEME_UNAVAILABLE:missing/theme');
  });

  it('does not build a public context without both a site and a published page', async () => {
    mocks.readPublishedPage.mockResolvedValue(null);
    await expect(buildCmsPageRenderContext({ tenantContext, slug: 'missing' })).resolves.toBeNull();
  });

  it('propagates authoritative host resolution failures without querying content', async () => {
    const error = { code: 'UNKNOWN_DOMAIN', publicStatus: 404, publicMessage: 'Site unavailable.', auditReason: 'missing' } as const;
    const tenantResolver = { resolve: vi.fn().mockResolvedValue({ ok: false, error }), require: vi.fn() };
    await expect(resolveCmsPageRenderContext(new Request('https://missing.example/about'), { slug: 'about', tenantResolver }))
      .resolves.toEqual({ ok: false, error });
    expect(mocks.readPublishedPage).not.toHaveBeenCalled();
  });
});
