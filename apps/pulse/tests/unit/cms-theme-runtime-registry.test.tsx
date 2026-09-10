import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { assertBundledThemeRuntimeCompleteness, createCmsThemeRuntimeRegistry, renderCmsThemePage } from '@/lib/cms/themes/runtimeRegistry';
import type { CmsPageRenderContext } from '@/lib/cms/pages/renderContext';
import { bundledExtensionCatalog } from '@/lib/cms/extensions/catalog';

describe('CMS theme runtime registry', () => {
  it('renders identical page content under two distinct bundled layouts', () => {
    const base = { siteName: 'Site', page: { pageId: 'page', revisionNumber: 4, snapshot: { title: 'Pinned title', templateId: 'sunset/page', blocks: [] } }, plugins: [], diagnostics: [] };
    const renderTheme = (id: string) => renderToStaticMarkup(<>{renderCmsThemePage({ ...base, theme: bundledExtensionCatalog.getTheme(id) } as unknown as CmsPageRenderContext)}</>);
    const core = renderTheme('sunset/core');
    const editorial = renderTheme('sunset/editorial');
    expect(core).toContain('Pinned title');
    expect(editorial).toContain('Pinned title');
    expect(editorial).toContain('sunset/editorial-header');
    expect(editorial).toContain('data-cms-page-revision="4"');
    expect(core).not.toEqual(editorial);
  });
  it('resolves parts from the supplied registry and fails for declared missing parts', () => {
    const registry = createCmsThemeRuntimeRegistry({
      templates: [{ id: 'test/page', render: (context, parts) => <>{parts.header(context)}<p>Content</p></> }],
      parts: [{ id: 'test/header', render: () => <header>Custom masthead</header> }],
    });
    const context = { page: { snapshot: { templateId: 'test/page' } }, theme: { templates: { page: 'test/page' }, templateParts: { header: 'test/header' } } } as unknown as CmsPageRenderContext;
    expect(renderToStaticMarkup(<>{renderCmsThemePage(context, registry)}</>)).toContain('Custom masthead');
    expect(() => renderCmsThemePage({ ...context, theme: { ...context.theme, templateParts: { header: 'missing/header' } } }, registry)).toThrow('CMS_THEME_TEMPLATE_PART_RUNTIME_UNAVAILABLE');
  });
  it('rejects duplicate runtime IDs and covers every bundled manifest entry', () => {
    expect(() => createCmsThemeRuntimeRegistry({ templates: [{ id: 'test/page', render: () => null }, { id: 'test/page', render: () => null }] })).toThrow('DUPLICATE_THEME_TEMPLATE_RUNTIME:test/page');
    expect(assertBundledThemeRuntimeCompleteness).not.toThrow();
  });

  it('renders the page snapshot template through the active theme runtime', () => {
    const context = {
      siteName: 'Runtime Realty',
      page: { pageId: 'page-id', revisionNumber: 1, snapshot: { title: 'Runtime page', excerpt: '', templateId: 'sunset/page', blocks: [] } },
      theme: { id: 'sunset/core', templates: { page: 'sunset/page' }, templateParts: { header: 'sunset/header', footer: 'sunset/footer' } },
      plugins: [], diagnostics: [], blockRegistry: { definitions: [], get: () => undefined },
    } as unknown as CmsPageRenderContext;
    const html = renderToStaticMarkup(<>{renderCmsThemePage(context)}</>);
    expect(html).toContain('Runtime page');
    expect(html).toContain('data-cms-template-part="sunset/header"');
  });

  it('falls back to the active theme default for an undeclared snapshot template', () => {
    const registry = createCmsThemeRuntimeRegistry({ templates: [{ id: 'test/page', render: () => <p>Fallback template</p> }] });
    const context = { page: { snapshot: { templateId: 'other/page' } }, theme: { templates: { page: 'test/page' } } } as unknown as CmsPageRenderContext;
    expect(renderToStaticMarkup(<>{renderCmsThemePage(context, registry)}</>)).toContain('Fallback template');
  });
});
