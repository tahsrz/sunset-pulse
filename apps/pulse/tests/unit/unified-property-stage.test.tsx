import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UnifiedPropertyStage from '@/components/marketing/UnifiedPropertyStage';

vi.mock('@/components/SafePropertyImage', () => ({ default: () => null }));
vi.mock('@/components/Spinner', () => ({ default: () => null }));

const listing = {
  _id: 'live-home-1',
  name: 'Live sample home',
  type: 'Residential',
  source: 'MLS',
  location: { city: 'Keller', state: 'TX' },
  images: ['https://images.example.test/home.jpg'],
  rates: {},
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('UnifiedPropertyStage live feed states', () => {
  it('ignores an aborted response after switching tabs and loads again when returning', async () => {
    let resolveFirst!: (response: Response) => void;
    const firstRequest = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    const fetchMock = vi.fn()
      .mockReturnValueOnce(firstRequest)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { listings: [listing] } }) });
    vi.stubGlobal('fetch', fetchMock);

    render(<UnifiedPropertyStage initialStagedProperties={[]} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const firstSignal = fetchMock.mock.calls[0][1].signal as AbortSignal;

    fireEvent.click(screen.getByRole('button', { name: 'Curated Listings' }));
    expect(firstSignal.aborted).toBe(true);
    await act(async () => {
      resolveFirst({ ok: true, json: async () => ({ data: { listings: [{ ...listing, name: 'Stale response' }] } }) } as Response);
    });
    expect(screen.queryByText('Stale response')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Live MLS Feed' }));
    expect(await screen.findByText('Live sample home')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('hides previously loaded listings and reports an error after a failed refresh', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { listings: [listing] } }) })
      .mockRejectedValueOnce(new Error('network unavailable'));
    vi.stubGlobal('fetch', fetchMock);

    render(<UnifiedPropertyStage initialStagedProperties={[]} />);
    expect(await screen.findByText('Live sample home')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Curated Listings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Live MLS Feed' }));

    expect(await screen.findByText(/couldn’t load the listing feed/i)).toBeInTheDocument();
    expect(screen.queryByText('Live sample home')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('The listing feed is temporarily unavailable');
  });
});
