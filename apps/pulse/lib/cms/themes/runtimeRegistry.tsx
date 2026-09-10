import React, { type ReactNode } from 'react';
import type { CmsPageRenderContext } from '@/lib/cms/pages/renderContext';
import { bundledExtensionCatalog } from '@/lib/cms/extensions/catalog';
import { SunsetFooterPart, SunsetHeaderPart, SunsetPageTemplate, type SunsetPageTemplateParts } from './SunsetPageTemplate';
import { EditorialPageTemplate, EditorialHeaderPart, EditorialFooterPart } from './EditorialPageTemplate';

export type CmsThemeTemplateRuntime = Readonly<{
  id: string;
  render: (context: CmsPageRenderContext, parts: SunsetPageTemplateParts) => ReactNode;
}>;

export type CmsThemePartRuntime = Readonly<{
  id: string;
  render: (context: CmsPageRenderContext) => ReactNode;
}>;

export function createCmsThemeRuntimeRegistry(input: {
  templates: readonly CmsThemeTemplateRuntime[];
  parts?: readonly CmsThemePartRuntime[];
}) {
  const templates = indexUnique(input.templates, 'THEME_TEMPLATE');
  const parts = indexUnique(input.parts || [], 'THEME_TEMPLATE_PART');
  return Object.freeze({
    getTemplate: (id: string) => templates.get(id),
    getPart: (id: string) => parts.get(id),
  });
}

function indexUnique<T extends { id: string }>(entries: readonly T[], kind: string) {
  const indexed = new Map<string, T>();
  for (const entry of entries) {
    if (indexed.has(entry.id)) throw new Error(`DUPLICATE_${kind}_RUNTIME:${entry.id}`);
    indexed.set(entry.id, Object.freeze(entry));
  }
  return indexed;
}

const sunsetHeaderRuntime = { id: 'sunset/header', render: SunsetHeaderPart } as const;
const sunsetFooterRuntime = { id: 'sunset/footer', render: SunsetFooterPart } as const;

export const bundledCmsThemeRuntimeRegistry = createCmsThemeRuntimeRegistry({
  parts: [sunsetHeaderRuntime, sunsetFooterRuntime,
    { id: 'sunset/editorial-header', render: EditorialHeaderPart },
    { id: 'sunset/editorial-footer', render: EditorialFooterPart }],
  templates: [{
    id: 'sunset/page',
    render: (context, parts) => <SunsetPageTemplate context={context} parts={parts} />,
  }, {
    id: 'sunset/editorial-page',
    render: (context, parts) => <EditorialPageTemplate context={context} parts={parts} />,
  }],
});

export function renderCmsThemePage(
  context: CmsPageRenderContext,
  registry = bundledCmsThemeRuntimeRegistry,
) {
  const { templateId: selectedTemplateId } = selectCmsThemeTemplate(context);
  const template = registry.getTemplate(selectedTemplateId);
  if (!template) throw new Error(`CMS_THEME_TEMPLATE_RUNTIME_UNAVAILABLE:${selectedTemplateId}`);
  const resolvePart = (slot: string) => {
    const id = context.theme.templateParts?.[slot];
    if (!id) return () => null;
    const part = registry.getPart(id);
    if (!part) throw new Error(`CMS_THEME_TEMPLATE_PART_RUNTIME_UNAVAILABLE:${id}`);
    return part.render;
  };
  return template.render(context, { header: resolvePart('header'), footer: resolvePart('footer') });
}

export function selectCmsThemeTemplate(context: CmsPageRenderContext) {
  const requested = context.page.snapshot.templateId;
  const fallback = !Object.values(context.theme.templates).includes(requested);
  const templateId = fallback ? context.theme.templates.page : requested;
  if (!templateId) throw new Error(`CMS_THEME_DEFAULT_TEMPLATE_REQUIRED:${context.theme.id}`);
  return { templateId, fallback };
}

export function assertBundledThemeRuntimeCompleteness() {
  for (const theme of bundledExtensionCatalog.themes) {
    if (!theme.templates.page) throw new Error(`CMS_THEME_DEFAULT_TEMPLATE_REQUIRED:${theme.id}`);
    for (const templateId of Object.values(theme.templates)) {
      if (!bundledCmsThemeRuntimeRegistry.getTemplate(templateId)) throw new Error(`CMS_THEME_TEMPLATE_RUNTIME_UNAVAILABLE:${templateId}`);
    }
    for (const partId of Object.values(theme.templateParts)) {
      if (!bundledCmsThemeRuntimeRegistry.getPart(partId)) throw new Error(`CMS_THEME_TEMPLATE_PART_RUNTIME_UNAVAILABLE:${partId}`);
    }
  }
}
