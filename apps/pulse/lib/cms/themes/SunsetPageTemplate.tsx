import Link from 'next/link';
import React, { type ReactNode } from 'react';
import { cmsThemeStyle } from './themeStyles';
import type { CmsPageRenderContext } from '@/lib/cms/pages/renderContext';
import { renderCmsPageBlocks } from '@/lib/cms/pages/blockRegistry';

export type SunsetPageTemplateParts = Readonly<{
  header: (context: CmsPageRenderContext) => ReactNode;
  footer: (context: CmsPageRenderContext) => ReactNode;
}>;

export function SunsetHeaderPart(context: CmsPageRenderContext) {
  const text = context.page.snapshot.presentation;
  return (
    <header className="border-b border-current/10 bg-[var(--color-surface,#f8fafc)]" data-cms-template-part="sunset/header">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" className="font-bold text-[var(--color-primary,currentColor)]">{text?.siteName ?? context.siteName}</Link>
        <nav aria-label={text?.navigationLabel ?? 'Site navigation'}><Link href="/" className="text-sm opacity-70 hover:opacity-100">{text?.homeLabel ?? 'Home'}</Link></nav>
      </div>
    </header>
  );
}

export function SunsetFooterPart(context: CmsPageRenderContext) {
  return (
    <footer className="border-t border-current/10 bg-[var(--color-surface,#f8fafc)]" data-cms-template-part="sunset/footer">
      <div className="mx-auto w-full max-w-5xl whitespace-pre-wrap px-5 py-8 text-sm opacity-70 sm:px-8 lg:px-10">{context.page.snapshot.presentation?.footerText ?? context.siteName}</div>
    </footer>
  );
}

const defaultParts: SunsetPageTemplateParts = { header: SunsetHeaderPart, footer: SunsetFooterPart };

export function SunsetPageTemplate({ context, parts = defaultParts }: { context: CmsPageRenderContext; parts?: SunsetPageTemplateParts }) {
  const snapshot = context.page.snapshot;
  const themeStyle = cmsThemeStyle(context.vibe?.cssVars, 'inherit');
  return (
    <div
      className="cms-theme min-h-screen bg-[var(--color-background,#ffffff)] text-[var(--color-text-primary,#111827)]"
      style={themeStyle}
      data-cms-page-id={context.page.pageId}
      data-cms-page-revision={context.page.revisionNumber}
      data-cms-theme={context.theme.id}
      data-vibe-revision-id={context.vibe?.revisionId}
    >
      {parts.header(context)}
      <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
        <header className="mb-10 border-b border-current/10 pb-8">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl" style={{ fontFamily: 'var(--font-family-heading, inherit)', fontWeight: 'var(--font-weight-bold, 700)' }}>{snapshot.title}</h1>
          {snapshot.excerpt ? <p className="mt-4 max-w-3xl text-lg opacity-70">{snapshot.excerpt}</p> : null}
        </header>
        <div className="flex flex-col" style={{ gap: 'calc(var(--spacing-base, 4px) * 6)' }} data-cms-page-content>
          {renderCmsPageBlocks(snapshot.blocks, { mode: 'public', registry: context.blockRegistry })}
        </div>
      </main>
      {parts.footer(context)}
    </div>
  );
}
