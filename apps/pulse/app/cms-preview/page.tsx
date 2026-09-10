import React from 'react';
import { headers } from 'next/headers';
import { z } from 'zod';
import connectDB from '@/lib/core/database';
import { getVibeCmsAccess } from '@/lib/core/operator_access';
import { readThemePreview } from '@/lib/cms/themes/themePreviewService';
import { renderCmsThemePage } from '@/lib/cms/themes/runtimeRegistry';
import './preview.css';
import { LivePreviewFrame } from './LivePreviewFrame';
import { PreviewInteractions } from './PreviewInteractions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Theme preview', robots: { index: false, follow: false } };
const querySchema = z.object({
  siteId: z.string().trim().min(1).max(200),
  tenantId: z.string().trim().min(1).max(200).default('default'),
  pageId: z.string().trim().min(1).max(200),
  themeId: z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/),
  mode: z.enum(['published', 'draft']).default('published'),
  channel: z.string().min(1).max(100).optional(),
});

export default async function CmsThemePreviewPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await getVibeCmsAccess((await headers()).get('host'));
  if (!access.allowed) return <p role="alert">Sign in with CMS access to preview this page.</p>;
  const parsed = querySchema.safeParse(await searchParams);
  if (!parsed.success) return <p role="alert">Choose a site, published page, and theme to preview.</p>;
  try {
    await connectDB();
    const context = await readThemePreview({ ...parsed.data, draftPreview: parsed.data.mode === 'draft' });
    if (!context) return <p role="status">This site or published page is unavailable. Publish a page, then refresh the preview.</p>;
    if (parsed.data.mode === 'draft' && parsed.data.channel) {
      const { blockRegistry: _registry, ...serializable } = context;
      // Only plain presentation data crosses the server/client boundary.
      return <LivePreviewFrame initial={JSON.parse(JSON.stringify({
        ...serializable,
        // Presentation registry selection needs manifests/versions, not operator settings.
        plugins: serializable.plugins.map((plugin) => ({ ...plugin, settings: {} })),
      }))} channel={parsed.data.channel} />;
    }
    return <PreviewInteractions>{renderCmsThemePage(context)}</PreviewInteractions>;
  } catch {
    return <p role="alert">The preview could not be loaded. Return to Themes and try again.</p>;
  }
}
