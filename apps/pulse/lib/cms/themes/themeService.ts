import SiteThemeActivation from '@/models/SiteThemeActivation';
import { bundledExtensionCatalog, DEFAULT_CMS_THEME_ID, type ExtensionCatalog } from '@/lib/cms/extensions/catalog';

export async function readSiteThemeCatalog(input: { tenantId: string; siteId: string; catalog?: ExtensionCatalog }) {
  const catalog = input.catalog || bundledExtensionCatalog;
  const activation = await SiteThemeActivation.findOne({ tenantId: input.tenantId, siteId: input.siteId }).lean() as any;
  const requestedId = activation?.themeId || DEFAULT_CMS_THEME_ID;
  const active = catalog.getTheme(requestedId);
  return { themes: catalog.themes, activeThemeId: active ? requestedId : DEFAULT_CMS_THEME_ID, activation: activation || null, diagnostic: active ? null : `ACTIVE_THEME_UNAVAILABLE:${requestedId}` };
}

export async function activateSiteTheme(input: { tenantId: string; siteId: string; themeId: string; actorId: string; catalog?: ExtensionCatalog }) {
  const catalog = input.catalog || bundledExtensionCatalog;
  const theme = catalog.getTheme(input.themeId);
  if (!theme) throw new Error('CMS_THEME_NOT_FOUND');
  const now = new Date();
  return SiteThemeActivation.findOneAndUpdate({ tenantId: input.tenantId, siteId: input.siteId }, { $set: { themeId: theme.id, version: theme.version, activatedAt: now, activatedBy: input.actorId } }, { upsert: true, new: true, runValidators: true }).lean();
}
