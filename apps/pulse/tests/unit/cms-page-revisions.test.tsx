import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CmsPageRevisions } from '@/app/vibes/pages/[pageId]/edit/CmsPageRevisions';

const draft = { schemaVersion: 1 as const, title: 'Earlier About', slug: 'about', excerpt: '', templateId: 'sunset/page', blocks: [] };
describe('CMS page revisions panel', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('refreshes publication history even when the saved draft version is unchanged', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ revisions: [] }) }).mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ revisions: [{ _id: 'rev-new', revisionNumber: 1 }] }) });
    vi.stubGlobal('fetch', fetchMock);
    const props = { pageId: 'home', siteId: 'site', version: 0, dirty: false, onRestore: vi.fn() };
    const view = render(<CmsPageRevisions {...props} refreshKey={0} />);
    await screen.findByText('No published revisions yet.');
    view.rerender(<CmsPageRevisions {...props} refreshKey={1} />);
    expect(await screen.findByText('Revision 1')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('keeps the tenant scope on revision reads and restores', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ revisions: [{ _id: 'rev-1', revisionNumber: 1 }] }) }).mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ page: { draftPayload: draft, currentDraftVersion: 2 } }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<CmsPageRevisions pageId="home" siteId="platform-site" tenantId="platform" version={1} dirty={false} onRestore={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Restore this revision' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm restore' }));
    await screen.findByText('Revision restored as a new draft.');
    expect(fetchMock.mock.calls.every(([url]) => url === '/api/vibes/pages/home/revisions?siteId=platform-site&tenantId=platform')).toBe(true);
  });
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
