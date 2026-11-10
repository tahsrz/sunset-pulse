import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PublicationReadiness from '@/components/marketing/PublicationReadiness';
import { publicationCatalog, type PublicationReadinessReport } from '@/lib/marketing/publicationReadiness';

function report(): PublicationReadinessReport {
  return { checkedAt: '2026-10-28T12:00:00.000Z', items: publicationCatalog.map(item => item.key === 'seller_profile'
    ? { key: item.key, state: 'needs_content', required: ['identity', 'biography', 'contact', 'review'], optional: ['photo'], warnings: [] }
    : { key: item.key, state: 'published', required: [], optional: ['photo', 'places', 'coordinates'], warnings: [] }) };
}
const fetcher = vi.fn();
beforeEach(() => { fetcher.mockReset().mockResolvedValue(Response.json(report())); vi.stubGlobal('fetch', fetcher); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('publication readiness UI', () => {
  it('keeps optional media separate from required seller content and published text guides', async () => {
    render(<PublicationReadiness />);
    const seller = await screen.findByRole('article', { name: 'Seller Introduction' });
    expect(within(seller).getByText('Needs Content')).toBeInTheDocument();
    expect(within(seller).getByText('Approved main-site phone or email')).toBeInTheDocument();
    expect(within(seller).queryByRole('link', { name: 'View Seller Introduction' })).not.toBeInTheDocument();
    const guide = screen.getByRole('article', { name: 'Old Town Keller' });
    expect(within(guide).getByText('Published')).toBeInTheDocument();
    expect(within(guide).getByRole('heading', { name: 'Optional Improvements' })).toBeInTheDocument();
    expect(within(guide).queryByRole('heading', { name: 'Required Before Publication' })).not.toBeInTheDocument();
    expect(within(guide).getByRole('link', { name: 'View Old Town Keller' })).toHaveAttribute('href', '/neighborhoods/old-town-keller');
    expect(screen.getByRole('link', { name: 'View Westlake' })).toHaveAttribute('href', '/neighborhoods/westlake-overview');
    expect(fetcher).toHaveBeenCalledWith('/api/admin/marketing/readiness', expect.objectContaining({ cache: 'no-store', signal: expect.any(AbortSignal) }));
    expect(fetcher.mock.calls[0][1]).not.toHaveProperty('method', 'POST');
  });
  it('shows exact review files and keeps the KCD contact separate', async () => {
    render(<PublicationReadiness />);
    await screen.findByRole('article', { name: 'Seller Introduction' });
    fireEvent.click(screen.getByText('Review Seller Introduction'));
    expect(screen.getByText('content/marketing/seller-introduction.v1.json')).toBeVisible();
    expect(screen.getByText(/The KCD contact is separate/)).toBeVisible();
    fireEvent.click(screen.getByText('Review Old Town Keller'));
    expect(screen.getByText('content/neighborhoods/old-town-keller.v1.json')).toBeVisible();
  });
  it('reports a loader failure as unchecked, with no invented missing fields or preview link', async () => {
    const value = report(); value.items[1] = { key: 'old_town_keller', state: 'unavailable', required: [], optional: [], warnings: [] };
    fetcher.mockResolvedValueOnce(Response.json(value));
    render(<PublicationReadiness />);
    const guide = await screen.findByRole('article', { name: 'Old Town Keller' });
    expect(within(guide).getByRole('alert')).toHaveTextContent('could not be checked');
    expect(within(guide).queryByText('Optional Improvements')).not.toBeInTheDocument();
    expect(within(guide).queryByRole('link')).not.toBeInTheDocument();
  });
  it('hides content after a denied response and retries the read', async () => {
    fetcher.mockResolvedValueOnce(new Response('{}', { status: 403 }));
    render(<PublicationReadiness />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Site administrator access is required');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    await screen.findByRole('article', { name: 'Seller Introduction' });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('rejects malformed reports and clears previous statuses on refresh', async () => {
    fetcher.mockResolvedValueOnce(Response.json({ checkedAt: '2026-10-28T12:00:00.000Z', items: [] }));
    render(<PublicationReadiness />);
    expect(await screen.findByRole('alert')).toHaveTextContent('response is invalid');
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    await screen.findByRole('article', { name: 'Seller Introduction' });
    fetcher.mockResolvedValueOnce(new Response('{}', { status: 503 }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Checks' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be checked');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
  it('aborts pending work on unmount and ignores a late response', async () => {
    let resolve!: (value: Response) => void;
    fetcher.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const view = render(<PublicationReadiness />);
    const signal = fetcher.mock.calls[0][1].signal as AbortSignal;
    view.unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => { resolve(Response.json(report())); });
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
});
