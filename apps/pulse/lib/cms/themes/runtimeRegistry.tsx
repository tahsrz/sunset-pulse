import React, { type ReactNode } from 'react';
import type { CmsPageRenderContext } from '@/lib/cms/pages/renderContext';
import { bundledExtensionCatalog } from '@/lib/cms/extensions/catalog';
import { SunsetFooterPart, SunsetHeaderPart, SunsetPageTemplate } from './SunsetPageTemplate';

export type CmsThemeTemplateRuntime = Readonly<{
  id: string;
  render: (context: CmsPageRenderContext) => ReactNode;
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
  parts: [sunsetHeaderRuntime, sunsetFooterRuntime],
  templates: [{
    id: 'sunset/page',
    render: (context) => (
      <SunsetPageTemplate
        context={context}
        parts={{
          header: sunsetHeaderRuntime.render,
          footer: sunsetFooterRuntime.render,
        }}
      />
    ),
  }],
});

export function renderCmsThemePage(
  context: CmsPageRenderContext,
  registry = bundledCmsThemeRuntimeRegistry,
) {
  const requestedTemplateId = context.page.snapshot.templateId;
  const declaredTemplateIds = new Set(Object.values(context.theme.templates));
  const defaultTemplateId = context.theme.templates.page;
  const selectedTemplateId = declaredTemplateIds.has(requestedTemplateId) ? requestedTemplateId : defaultTemplateId;
  const template = registry.getTemplate(selectedTemplateId);
  if (!template) throw new Error(`CMS_THEME_TEMPLATE_RUNTIME_UNAVAILABLE:${selectedTemplateId}`);
  return template.render(context);
}

export function assertBundledThemeRuntimeCompleteness() {
  for (const theme of bundledExtensionCatalog.themes) {
    for (const templateId of Object.values(theme.templates)) {
      if (!bundledCmsThemeRuntimeRegistry.getTemplate(templateId)) throw new Error(`CMS_THEME_TEMPLATE_RUNTIME_UNAVAILABLE:${templateId}`);
    }
    for (const partId of Object.values(theme.templateParts)) {
      if (!bundledCmsThemeRuntimeRegistry.getPart(partId)) throw new Error(`CMS_THEME_TEMPLATE_PART_RUNTIME_UNAVAILABLE:${partId}`);
    }
  }
}
