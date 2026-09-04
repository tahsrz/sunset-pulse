import { cache } from 'react';
import type { Metadata } from 'next';
import connectDB from '@/lib/core/database';
import { createPublicTenantContextResolver } from '@/lib/tenancy/publicTenantResolver';
import { resolveCmsPageRenderContext, type CmsPageRenderContext } from './renderContext';
import { cmsSlugForTenantPath } from './publicPath';

export const resolvePublishedCmsPageForHost = cache(async (tenantHost: string, slug: string) => {
  await connectDB();
  const publicRequest = new Request(`https://${tenantHost}/${encodeURIComponent(slug)}`, { headers: { host: tenantHost } });
  return resolveCmsPageRenderContext(publicRequest, {
    slug,
    tenantResolver: createPublicTenantContextResolver(),
  });
});

type PublishedPageResolver = typeof resolvePublishedCmsPageForHost;

export async function resolveTenantCmsRoute(
  input: { tenantHost: string | null; path: readonly string[] },
  dependencies: { resolvePage?: PublishedPageResolver } = {},
) {
  const slug = cmsSlugForTenantPath(input.path);
  if (!slug || !input.tenantHost) return { kind: 'legacy' as const };
  const result = await (dependencies.resolvePage || resolvePublishedCmsPageForHost)(input.tenantHost, slug);
  if (!result.ok) return { kind: 'legacy' as const };
  return { kind: 'cms' as const, slug, context: result.context };
}

export function metadataForCmsPage(context: CmsPageRenderContext): Metadata {
  const snapshot = context.page.snapshot;
  const pathname = context.page.routePath === 'home' ? '/' : `/${context.page.routePath}`;
  const title = `${snapshot.title} | ${context.siteName}`;
  const description = snapshot.excerpt || `${snapshot.title} from ${context.siteName}.`;
  return {
    title,
    description,
    alternates: { canonical: pathname },
    openGraph: { title, description, type: 'website', url: pathname },
  };
}
