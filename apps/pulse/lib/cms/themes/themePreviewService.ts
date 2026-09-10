import { buildScopedCmsPageRenderContext } from '@/lib/cms/pages/renderContext';

export function readThemePreview(input: { tenantId: string; siteId: string; pageId: string; themeId: string; draftPreview?: boolean }) {
  return buildScopedCmsPageRenderContext({ ...input, requestId: crypto.randomUUID(), hostname: '' });
}
