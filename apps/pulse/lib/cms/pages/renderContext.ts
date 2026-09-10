import type { TenantContext, TenantContextResolver } from '@/lib/tenancy/contracts';
import { SiteConfig } from '@/models/SiteConfig';
import SitePluginActivation from '@/models/SitePluginActivation';
import SiteThemeActivation from '@/models/SiteThemeActivation';
import VibeRevision from '@/models/VibeRevision';
import {
  bundledExtensionCatalog,
  DEFAULT_CMS_THEME_ID,
  type ExtensionCatalog,
} from '@/lib/cms/extensions/catalog';
import { readPublishedCmsPage, readCmsPagePreview } from './pageService';
import { composeCmsBlockRegistry, bundledCmsPluginRuntimeCatalog, type CmsPluginRuntimeCatalog } from '@/lib/cms/extensions/runtimeCatalog';
import type { CmsBlockRegistry } from './blockRegistry';

export type CmsPageRenderContext = Readonly<{
  requestId: string;
  tenantId: string;
  siteId: string;
  siteName: string;
  hostname: string;
  page: NonNullable<Awaited<ReturnType<typeof readPublishedCmsPage>>>;
  theme: NonNullable<ReturnType<ExtensionCatalog['getTheme']>>;
  vibe: null | Readonly<{
    revisionId: string;
    vibeId: string;
    revisionNumber: number;
    cssVars: Readonly<Record<string, string>>;
  }>;
  plugins: ReadonlyArray<Readonly<{
    manifest: NonNullable<ReturnType<ExtensionCatalog['getPlugin']>>;
    activationVersion: string;
    settings: Readonly<Record<string, unknown>>;
  }>>;
  blockRegistry: CmsBlockRegistry;
  diagnostics: ReadonlyArray<string>;
}>;

export async function resolveCmsPageRenderContext(
  request: Request,
  input: { slug: string; tenantResolver: TenantContextResolver; catalog?: ExtensionCatalog; runtimeCatalog?: CmsPluginRuntimeCatalog },
) {
  const resolution = await input.tenantResolver.resolve(request);
  if (!resolution.ok) return { ok: false as const, error: resolution.error };
  const context = await buildCmsPageRenderContext({ tenantContext: resolution.context, slug: input.slug, catalog: input.catalog, runtimeCatalog: input.runtimeCatalog });
  if (!context) return { ok: false as const, error: { code: 'PAGE_NOT_FOUND' as const, publicStatus: 404 as const, publicMessage: 'Page not found.' as const } };
  return { ok: true as const, context };
}

export async function buildCmsPageRenderContext(input: {
  tenantContext: TenantContext;
  slug: string;
  catalog?: ExtensionCatalog;
  runtimeCatalog?: CmsPluginRuntimeCatalog;
}): Promise<CmsPageRenderContext | null> {
  return buildScopedCmsPageRenderContext({
    tenantId: input.tenantContext.identity.tenantId,
    siteId: input.tenantContext.identity.agentId,
    requestId: input.tenantContext.requestId,
    hostname: input.tenantContext.domain.hostname,
    routePath: input.slug,
    catalog: input.catalog,
    runtimeCatalog: input.runtimeCatalog,
  });
}

/** Shared composition for public host resolution and authenticated operator previews. */
export async function buildScopedCmsPageRenderContext(input: {
  tenantId: string;
  siteId: string;
  requestId: string;
  hostname: string;
  routePath?: string;
  pageId?: string;
  themeId?: string;
  draftPreview?: boolean;
  catalog?: ExtensionCatalog;
  runtimeCatalog?: CmsPluginRuntimeCatalog;
}): Promise<CmsPageRenderContext | null> {
  const catalog = input.catalog || bundledExtensionCatalog;
  if (input.themeId && !catalog.getTheme(input.themeId)) throw new Error('CMS_THEME_NOT_FOUND');
  const { tenantId, siteId } = input;
  const [page, site, themeActivation, pluginActivations] = await Promise.all([
    input.draftPreview && input.pageId
      ? readCmsPagePreview({ tenantId, siteId, pageId: input.pageId }).then((draft) => draft ? ({
          pageId: draft.pageId, routePath: draft.routePath, revisionNumber: draft.currentDraftVersion, snapshot: draft.draftPayload,
        }) : null)
      : readPublishedCmsPage({ tenantId, siteId, ...(input.pageId ? { pageId: input.pageId } : { routePath: input.routePath }) }),
    SiteConfig.findOne({ agentId: siteId }).select('agentId branding.siteName activeVibeRevisionId').lean() as Promise<any>,
    SiteThemeActivation.findOne({ tenantId, siteId }).lean() as Promise<any>,
    SitePluginActivation.find({ tenantId, siteId, status: 'active' }).sort({ pluginId: 1 }).lean() as Promise<any[]>,
  ]);
  if (!page || !site) return null;

  const diagnostics: string[] = [];
  const requestedThemeId = input.themeId || themeActivation?.themeId || DEFAULT_CMS_THEME_ID;
  let theme = catalog.getTheme(requestedThemeId);
  if (!theme) {
    diagnostics.push(`ACTIVE_THEME_UNAVAILABLE:${requestedThemeId}`);
    theme = catalog.getTheme(DEFAULT_CMS_THEME_ID);
  }
  if (!theme) throw new Error('DEFAULT_CMS_THEME_UNAVAILABLE');
  if (!input.themeId && themeActivation && themeActivation.version !== theme.version) {
    diagnostics.push(`ACTIVE_THEME_VERSION_MISMATCH:${requestedThemeId}`);
  }

  const plugins = pluginActivations.flatMap((activation) => {
    const manifest = catalog.getPlugin(activation.pluginId);
    if (!manifest) {
      diagnostics.push(`ACTIVE_PLUGIN_UNAVAILABLE:${activation.pluginId}`);
      return [];
    }
    if (manifest.version !== activation.version) diagnostics.push(`ACTIVE_PLUGIN_VERSION_MISMATCH:${activation.pluginId}`);
    return [{ manifest, activationVersion: activation.version, settings: Object.freeze({ ...(activation.settings || {}) }) }];
  });

  const composedBlocks = composeCmsBlockRegistry({
    activePlugins: plugins,
    runtimeCatalog: input.runtimeCatalog || bundledCmsPluginRuntimeCatalog,
  });
  diagnostics.push(...composedBlocks.diagnostics);

  let vibe: CmsPageRenderContext['vibe'] = null;
  if (site.activeVibeRevisionId) {
    const revision = await VibeRevision.findOne({
      _id: site.activeVibeRevisionId,
      tenantId,
      publishedAt: { $exists: true, $ne: null },
    }).select('_id vibeId revisionNumber cssVars').lean() as any;
    if (revision) {
      vibe = Object.freeze({
        revisionId: String(revision._id),
        vibeId: revision.vibeId,
        revisionNumber: revision.revisionNumber,
        cssVars: Object.freeze({ ...(revision.cssVars || {}) }),
      });
    } else {
      diagnostics.push(`ACTIVE_VIBE_REVISION_UNAVAILABLE:${site.activeVibeRevisionId}`);
    }
  }

  return Object.freeze({
    requestId: input.requestId,
    tenantId,
    siteId,
    siteName: site.branding?.siteName || site.agentId,
    hostname: input.hostname,
    page,
    theme,
    vibe,
    plugins: Object.freeze(plugins),
    blockRegistry: composedBlocks.registry,
    diagnostics: Object.freeze(diagnostics),
  });
}
