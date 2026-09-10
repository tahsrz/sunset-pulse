import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveDraftPreview } from '@/app/vibes/pages/LiveDraftPreview';
import { LivePreviewFrame, type SerializablePreviewContext } from '@/app/cms-preview/LivePreviewFrame';
import { cmsPageDraftSchema } from '@/lib/cms/pages/pageSchema';
import { bundledExtensionCatalog } from '@/lib/cms/extensions/catalog';

const draft = cmsPageDraftSchema.parse({ title: 'Initial title', slug: 'home', blocks: [] });
describe('Live draft preview', () => {
  afterEach(() => vi.restoreAllMocks());
  it('sends newest unsaved text on ready and subsequent edits without API writes', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const view = render(<LiveDraftPreview draft={draft} dirty={false} siteId="site" pageId="page" />);
    const iframe = screen.getByTitle('Live homepage and page preview') as HTMLIFrameElement;
    const target = iframe.contentWindow!;
    const post = vi.spyOn(target, 'postMessage');
    const channel = new URL(iframe.src).searchParams.get('channel');
    const edited = { ...draft, title: 'Unsaved heading' };
    view.rerender(<LiveDraftPreview draft={edited} dirty siteId="site" pageId="page" />);
    act(() => window.dispatchEvent(new MessageEvent('message', { source: target, origin: location.origin, data: { type: 'cms-preview:ready', channel } })));
    expect(post).toHaveBeenCalledWith(expect.objectContaining({ draft: edited }), location.origin);
    view.rerender(<LiveDraftPreview draft={{ ...edited, title: 'Typing again' }} dirty siteId="site" pageId="page" />);
    await waitFor(() => expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ draft: expect.objectContaining({ title: 'Typing again' }) }), location.origin));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('retains the last valid draft when a required field is temporarily empty', () => {
    render(<LiveDraftPreview draft={{ ...draft, title: '' }} dirty siteId="site" pageId="page" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Your text is retained');
  });
  it('ignores stale frame updates and uses the same selected theme presentation', () => {
    const initial = {
      requestId: 'r', tenantId: 't', siteId: 's', siteName: 'Site', hostname: '',
      page: { pageId: 'p', revisionNumber: 1, snapshot: draft },
      theme: bundledExtensionCatalog.getTheme('sunset/core'), vibe: null, plugins: [], diagnostics: [],
    } as SerializablePreviewContext;
    render(<LivePreviewFrame initial={initial} channel="test" />);
    const send = (sequence: number, title: string) => act(() => window.dispatchEvent(new MessageEvent('message', {
      source: window.parent, origin: location.origin,
      data: { type: 'cms-preview:update', channel: 'test', sequence, themeId: 'sunset/editorial', draft: { ...draft, title } },
    })));
    send(2, 'Newest');
    send(1, 'Stale');
    expect(screen.getByText('Newest')).toBeInTheDocument();
    expect(screen.queryByText('Stale')).not.toBeInTheDocument();
    expect(document.querySelector('[data-cms-theme="sunset/editorial"]')).not.toBeNull();
  });
});
