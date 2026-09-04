import { cache } from 'react';
import type { Metadata } from 'next';
import connectDB from '@/lib/core/database';
import { createPublicTenantContextResolver } from '@/lib/tenancy/publicTenantResolver';
import { resolveCmsPageRenderContext, type CmsPageRenderContext } from './renderContext';

export const resolvePublishedCmsPageForHost = cache(async (tenantHost: string, slug: string) => {
  await connectDB();
  const publicRequest = new Request(`https://${tenantHost}/${encodeURIComponent(slug)}`, { headers: { host: tenantHost } });
  return resolveCmsPageRenderContext(publicRequest, {
    slug,
    tenantResolver: createPublicTenantContextResolver(),
  });
});

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
