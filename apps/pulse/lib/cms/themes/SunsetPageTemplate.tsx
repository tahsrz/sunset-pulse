import React, { type CSSProperties } from 'react';
import type { CmsPageRenderContext } from '@/lib/cms/pages/renderContext';
import { renderCmsPageBlocks } from '@/lib/cms/pages/blockRegistry';

export function SunsetPageTemplate({ context }: { context: CmsPageRenderContext }) {
  const snapshot = context.page.snapshot;
  return (
    <main
      className="min-h-screen bg-[var(--color-background,#ffffff)] text-[var(--color-text-primary,#111827)]"
      style={context.vibe?.cssVars as CSSProperties | undefined}
      data-cms-page-id={context.page.pageId}
      data-cms-page-revision={context.page.revisionNumber}
      data-cms-theme={context.theme.id}
      data-vibe-revision-id={context.vibe?.revisionId}
    >
      <article className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
        <header className="mb-10 border-b border-current/10 pb-8">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">{snapshot.title}</h1>
          {snapshot.excerpt ? <p className="mt-4 max-w-3xl text-lg opacity-70">{snapshot.excerpt}</p> : null}
        </header>
        <div className="space-y-6" data-cms-page-content>
          {renderCmsPageBlocks(snapshot.blocks, { mode: 'public' })}
        </div>
      </article>
    </main>
  );
}
