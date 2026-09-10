'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { CmsPageRenderContext } from '@/lib/cms/pages/renderContext';
import { renderCmsThemePage } from '@/lib/cms/themes/runtimeRegistry';
import { bundledExtensionCatalog } from '@/lib/cms/extensions/catalog';
import { composeCmsBlockRegistry } from '@/lib/cms/extensions/runtimeCatalog';
import { livePreviewUpdateSchema } from '@/lib/cms/themes/livePreviewContract';
import { PreviewInteractions } from './PreviewInteractions';

export type SerializablePreviewContext = Omit<CmsPageRenderContext, 'blockRegistry'>;

export function LivePreviewFrame({ initial, channel }: { initial: SerializablePreviewContext; channel: string }) {
  const [context, setContext] = useState(initial);
  const sequence = useRef(-1);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== window.location.origin) return;
      if (event.data?.type === 'cms-preview:connect' && event.data?.channel === channel) {
        window.parent.postMessage({ type: 'cms-preview:ready', channel }, window.location.origin);
        return;
      }
      const parsed = livePreviewUpdateSchema.safeParse(event.data);
      if (!parsed.success || parsed.data.channel !== channel || parsed.data.sequence <= sequence.current) return;
      const theme = bundledExtensionCatalog.getTheme(parsed.data.themeId);
      if (!theme) return;
      sequence.current = parsed.data.sequence;
      setContext((value) => ({ ...value, page: { ...value.page, snapshot: parsed.data.draft }, theme }));
    };
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: 'cms-preview:ready', channel }, window.location.origin);
    return () => window.removeEventListener('message', receive);
  }, [channel]);
  const composed = composeCmsBlockRegistry({ activePlugins: context.plugins });
  return <PreviewInteractions>{renderCmsThemePage({ ...context, blockRegistry: composed.registry })}</PreviewInteractions>;
}
