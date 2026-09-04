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
import { readPublishedCmsPage } from './pageService';

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
    settings: Readonly<Record<string, unknown>>;
  }>>;
  diagnostics: ReadonlyArray<string>;
}>;

export async function resolveCmsPageRenderContext(
  request: Request,
  input: { slug: string; tenantResolver: TenantContextResolver; catalog?: ExtensionCatalog },
) {
  const resolution = await input.tenantResolver.resolve(request);
  if (!resolution.ok) return { ok: false as const, error: resolution.error };
  const context = await buildCmsPageRenderContext({ tenantContext: resolution.context, slug: input.slug, catalog: input.catalog });
  if (!context) return { ok: false as const, error: { code: 'PAGE_NOT_FOUND' as const, publicStatus: 404 as const, publicMessage: 'Page not found.' as const } };
  return { ok: true as const, context };
}

export async function buildCmsPageRenderContext(input: {
  tenantContext: TenantContext;
  slug: string;
  catalog?: ExtensionCatalog;
}): Promise<CmsPageRenderContext | null> {
  const catalog = input.catalog || bundledExtensionCatalog;
  const tenantId = input.tenantContext.identity.tenantId;
  const siteId = input.tenantContext.identity.agentId;
  const [page, site, themeActivation, pluginActivations] = await Promise.all([
    readPublishedCmsPage({ tenantId, siteId, routePath: input.slug }),
    SiteConfig.findOne({ agentId: siteId }).select('agentId branding.siteName activeVibeRevisionId').lean() as Promise<any>,
    SiteThemeActivation.findOne({ tenantId, siteId }).lean() as Promise<any>,
    SitePluginActivation.find({ tenantId, siteId, status: 'active' }).sort({ pluginId: 1 }).lean() as Promise<any[]>,
  ]);
  if (!page || !site) return null;

  const diagnostics: string[] = [];
  const requestedThemeId = themeActivation?.themeId || DEFAULT_CMS_THEME_ID;
  let theme = catalog.getTheme(requestedThemeId);
  if (!theme) {
    diagnostics.push(`ACTIVE_THEME_UNAVAILABLE:${requestedThemeId}`);
    theme = catalog.getTheme(DEFAULT_CMS_THEME_ID);
  }
  if (!theme) throw new Error('DEFAULT_CMS_THEME_UNAVAILABLE');
  if (themeActivation && themeActivation.version !== theme.version) {
    diagnostics.push(`ACTIVE_THEME_VERSION_MISMATCH:${requestedThemeId}`);
  }

  const plugins = pluginActivations.flatMap((activation) => {
    const manifest = catalog.getPlugin(activation.pluginId);
    if (!manifest) {
      diagnostics.push(`ACTIVE_PLUGIN_UNAVAILABLE:${activation.pluginId}`);
      return [];
    }
    if (manifest.version !== activation.version) diagnostics.push(`ACTIVE_PLUGIN_VERSION_MISMATCH:${activation.pluginId}`);
    return [{ manifest, settings: Object.freeze({ ...(activation.settings || {}) }) }];
  });

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
    requestId: input.tenantContext.requestId,
    tenantId,
    siteId,
    siteName: site.branding?.siteName || site.agentId,
    hostname: input.tenantContext.domain.hostname,
    page,
    theme,
    vibe,
    plugins: Object.freeze(plugins),
    diagnostics: Object.freeze(diagnostics),
  });
}
