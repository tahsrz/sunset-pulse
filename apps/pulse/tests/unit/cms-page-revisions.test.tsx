import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CmsPageRevisions } from '@/app/vibes/pages/[pageId]/edit/CmsPageRevisions';

const draft = { schemaVersion: 1 as const, title: 'Earlier About', slug: 'about', excerpt: '', templateId: 'sunset/page', blocks: [] };
describe('CMS page revisions panel', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('confirms and restores into the next draft version', async () => {
    const onRestore = vi.fn();
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, status: 200, text: async () => JSON.stringify({ revisions: [{ _id: 'rev-2', revisionNumber: 2 }] }) }).mockResolvedValueOnce({ ok: true, status: 200, text: async () => JSON.stringify({ page: { draftPayload: draft, currentDraftVersion: 5 } }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<CmsPageRevisions pageId="page-1" siteId="site-a" version={4} dirty={false} onRestore={onRestore} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Restore this revision' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm restore' }));
    await waitFor(() => expect(onRestore).toHaveBeenCalledWith(draft, 5));
    expect(fetchMock).toHaveBeenLastCalledWith('/api/vibes/pages/page-1/revisions?siteId=site-a', expect.objectContaining({ method: 'POST', body: JSON.stringify({ revisionId: 'rev-2', expectedVersion: 4 }) }));
  });
  it('disables restore while local changes exist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ revisions: [{ _id: 'rev-1', revisionNumber: 1 }] }) }));
    render(<CmsPageRevisions pageId="page-1" siteId="site-a" version={4} dirty onRestore={vi.fn()} />);
    expect(await screen.findByRole('button', { name: 'Restore this revision' })).toBeDisabled();
  });
});
