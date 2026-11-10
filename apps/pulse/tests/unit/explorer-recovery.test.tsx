import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { explorerEnvelope, explorerListing } from '../fixtures/explorerListing';

const mocks = vi.hoisted(() => ({ load: vi.fn(), params: new URLSearchParams(), mode: 'ready' }));
vi.mock('@/lib/explorer/loadMap', () => ({ loadExplorerMap: mocks.load }));
vi.mock('next/navigation', () => ({ useSearchParams: () => mocks.params }));
import { ExplorerMapPanel } from '@/components/explorer/ExplorerMapPanel';
import { ExplorerContent } from '@/components/explorer/ExplorerContent';

function TestMap({ onUnavailable, onSelectionChange }: { onUnavailable: () => void; onSelectionChange: (value: { type: 'radius'; data: string }) => void }) {
  if (mocks.mode === 'throw') throw new Error('renderer failed');
  return <div aria-label="Loaded map">
    <button onClick={onUnavailable}>Simulate Mapbox Error</button>
    <button onClick={() => onSelectionChange({ type: 'radius', data: '32,-97,5' })}>Select Area</button>
  </div>;
}
beforeEach(() => {
  mocks.params = new URLSearchParams(); mocks.mode = 'ready';
  mocks.load.mockReset().mockResolvedValue({ default: TestMap });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Explorer map isolation and recovery', () => {
  it('recovers a rejected chunk with a new import and ignores completion after unmount', async () => {
    mocks.load.mockRejectedValueOnce(new Error('ChunkLoadError'));
    const view = render(<ExplorerMapPanel listings={[]} onSelectionChange={vi.fn()} />);
    await screen.findByRole('button', { name: 'Retry Map' });
    fireEvent.click(screen.getByRole('button', { name: 'Retry Map' }));
    await screen.findByLabelText('Loaded map');
    expect(mocks.load).toHaveBeenCalledTimes(2);
    view.unmount();
    let resolve!: (value: { default: typeof TestMap }) => void;
    mocks.load.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const late = render(<ExplorerMapPanel listings={[]} onSelectionChange={vi.fn()} />);
    late.unmount();
    await act(async () => { resolve({ default: TestMap }); });
    expect(screen.queryByLabelText('Loaded map')).not.toBeInTheDocument();
  });
  it('catches renderer exceptions and remounts after retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.mode = 'throw';
    render(<ExplorerMapPanel listings={[]} onSelectionChange={vi.fn()} />);
    await screen.findByRole('button', { name: 'Retry Map' });
    mocks.mode = 'ready';
    fireEvent.click(screen.getByRole('button', { name: 'Retry Map' }));
    await screen.findByLabelText('Loaded map');
  });
  it('keeps nonspatial listings, links, real-price samples and area selection when Mapbox fails', async () => {
    const listings = [explorerListing({ location_geo: undefined }), explorerListing({ id: 'lease', _id: 'lease', name: 'Lease Fixture', price_type: 'lease', rates: { monthly: 2200 } })];
    const fetcher = vi.fn(async (url: string) => Response.json(explorerEnvelope(url.includes('/search?') ? listings : { properties: listings, total: 2 })));
    vi.stubGlobal('fetch', fetcher);
    render(<ExplorerContent />);
    await screen.findByRole('link', { name: '808 W Abram St' });
    expect(screen.getByText('Map location not listed.')).toBeInTheDocument();
    expect(screen.getByText('Average sale asking price (1 listing)')).toBeInTheDocument();
    expect(screen.getByText('Average monthly rent (1 listing)')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Select Area' }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    await screen.findByRole('link', { name: '808 W Abram St' });
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Mapbox Error' }));
    await screen.findByRole('button', { name: 'Retry Map' });
    expect(screen.getByRole('link', { name: '808 W Abram St' })).toHaveAttribute('href', '/properties/explorer-fixture');
    expect(screen.getByRole('button', { name: 'Clear Area' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry Map' }));
    await screen.findByLabelText('Loaded map');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('distinguishes unavailable search from empty results and retries without reloading', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json(explorerEnvelope({ properties: [], total: 0 }, { source: 'unavailable' })))
      .mockResolvedValueOnce(Response.json(explorerEnvelope({ properties: [], total: 0 })));
    vi.stubGlobal('fetch', fetcher);
    render(<ExplorerContent />);
    await screen.findByText('Property search is temporarily unavailable.');
    expect(screen.queryByText('No properties were returned for this search.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry Search' }));
    await screen.findByText('No properties were returned for this search.');
  });
  it('does not load Mapbox or fetch for invalid coordinates', () => {
    mocks.params = new URLSearchParams('lat=32');
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    render(<ExplorerContent />);
    expect(screen.getByRole('alert')).toHaveTextContent('Include both latitude and longitude.');
    expect(fetcher).not.toHaveBeenCalled();
    expect(mocks.load).not.toHaveBeenCalled();
  });
});
