import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useExplorerSearch } from '@/hooks/useExplorerSearch';
import type { ExplorerQuery } from '@/lib/explorer/publicSearch';
import { explorerEnvelope, explorerListing } from '../fixtures/explorerListing';

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
const query = (url: string): ExplorerQuery => ({ url, shape: 'search' });
const response = (id: string) => Response.json(explorerEnvelope([explorerListing({ id, _id: id })]));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Explorer request lifecycle', () => {
  it('aborts superseded requests and ignores late responses even when the transport ignores abort', async () => {
    const old = deferred<Response>();
    const current = deferred<Response>();
    const fetcher = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    vi.stubGlobal('fetch', fetcher);
    const view = renderHook(({ url }) => useExplorerSearch(query(url), 0), { initialProps: { url: '/old' } });
    const firstSignal = fetcher.mock.calls[0][1].signal as AbortSignal;
    view.rerender({ url: '/current' });
    expect(firstSignal.aborted).toBe(true);
    expect(view.result.current.status).toBe('loading');
    await act(async () => { current.resolve(response('current')); });
    await act(async () => { old.resolve(response('old')); });
    expect(view.result.current).toMatchObject({ status: 'ready', listings: [{ id: 'current' }] });
  });
  it('clears previous results while a new query is loading and aborts on unmount', async () => {
    const next = deferred<Response>();
    const fetcher = vi.fn().mockResolvedValueOnce(response('old')).mockReturnValueOnce(next.promise);
    vi.stubGlobal('fetch', fetcher);
    const view = renderHook(({ url }) => useExplorerSearch(query(url), 0), { initialProps: { url: '/old' } });
    await waitFor(() => expect(view.result.current.status).toBe('ready'));
    view.rerender({ url: '/next' });
    expect(view.result.current).toEqual({ status: 'loading' });
    view.unmount();
    expect(fetcher.mock.calls[1][1].signal.aborted).toBe(true);
    await act(async () => { next.resolve(response('late')); });
  });
  it('retries the same query after failure and does not fetch invalid queries', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response('retry'));
    vi.stubGlobal('fetch', fetcher);
    const view = renderHook(({ input, attempt }) => useExplorerSearch(input, attempt), { initialProps: { input: query('/same'), attempt: 0 } });
    await waitFor(() => expect(view.result.current.status).toBe('unavailable'));
    view.rerender({ input: query('/same'), attempt: 1 });
    await waitFor(() => expect(view.result.current.status).toBe('ready'));
    view.rerender({ input: { error: 'invalid' }, attempt: 1 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(view.result.current.status).toBe('loading');
  });
});
