import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { explorerListing } from '../fixtures/explorerListing';

const mocks = vi.hoisted(() => ({ map: null as any, draw: vi.fn(), directions: vi.fn(), sources: [] as any[], marker: vi.fn() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('@/hooks/useJamieInsights', () => ({ useJamieInsights: () => ({ jamieInsights: [{ geometry: { coordinates: [NaN, 0] } }] }) }));
vi.mock('@/hooks/useValuations', () => ({ useValuations: () => ({ valuations: [{ _id: 'valuation', estimate: 900000, location_geo: { coordinates: [-97, 32] } }, { _id: 'bad' }] }) }));
vi.mock('@mapbox/mapbox-gl-draw', () => ({ default: mocks.draw }));
vi.mock('@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions', () => ({ default: mocks.directions }));
vi.mock('react-map-gl', async () => {
  const ReactModule = await import('react');
  return {
    default: ReactModule.forwardRef(function MockMap(props: any, ref) {
      ReactModule.useImperativeHandle(ref, () => ({ getMap: () => mocks.map }));
      return <div aria-label="Map renderer">
        <button onClick={() => { void props.onLoad({ target: mocks.map }); }}>Load Map Controls</button>
        <button onClick={props.onError}>Fail Map Renderer</button>
        {props.children}
      </div>;
    }),
    Source: (props: any) => { mocks.sources.push(props); return <>{props.children}</>; },
    Layer: () => null, NavigationControl: () => null, FullscreenControl: () => null, Popup: () => null,
    Marker: (props: any) => { mocks.marker(props); return <div data-testid="marker">{props.children}</div>; },
  };
});
import ExplorerMap from '@/components/ExplorerMap';
import PropertyMarker from '@/components/explorer/PropertyMarker';

beforeEach(() => {
  mocks.sources = []; mocks.marker.mockClear();
  mocks.draw.mockReset().mockImplementation(function () { return { getAll: () => ({ features: [] }), deleteAll: vi.fn() }; });
  mocks.directions.mockReset().mockImplementation(function () { return {}; });
  mocks.map = {
    getSource: vi.fn(() => null), on: vi.fn(), once: vi.fn(), off: vi.fn(),
    addControl: vi.fn(), hasControl: vi.fn(() => true), removeControl: vi.fn(),
    getBounds: () => ({ getNorth: () => 33, getSouth: () => 32, getEast: () => -96, getWest: () => -97 }),
  };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('ExplorerMap real component with mocked Mapbox adapter', () => {
  it('omits invalid marker coordinates and keeps valuations out of listing density', () => {
    render(<ExplorerMap results={[explorerListing(), explorerListing({ id: 'missing', location_geo: undefined })]} onSelectionChange={vi.fn()} />);
    expect(screen.getAllByTestId('marker')).toHaveLength(2); // One property and one separate valuation.
    expect(screen.getByText('$400,000')).toBeInTheDocument();
    const source = mocks.sources.find(source => source.id === 'properties');
    expect(source.data.features).toHaveLength(1);
    expect(source.data.features[0].properties.price).toBe(400000);
    expect(JSON.stringify(source.data)).not.toContain('valuation');
    for (const [props] of mocks.marker.mock.calls) {
      expect(Number.isFinite(props.latitude)).toBe(true);
      expect(Number.isFinite(props.longitude)).toBe(true);
    }
  });
  it('does not mount a marker for a public listing without coordinates', () => {
    const { container } = render(<PropertyMarker property={explorerListing({ location_geo: undefined })} hoveredId={null} onSelect={vi.fn()} resultsCount={1} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('removes controls and exact draw listeners on unmount', async () => {
    const view = render(<ExplorerMap results={[]} onSelectionChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load Map Controls' }));
    await waitFor(() => expect(mocks.map.addControl).toHaveBeenCalledTimes(1));
    const drawListeners = mocks.map.on.mock.calls.filter(([name]: [string]) => name.startsWith('draw.'));
    expect(drawListeners).toHaveLength(3);
    view.unmount();
    for (const [name, handler] of drawListeners) expect(mocks.map.off).toHaveBeenCalledWith(name, handler);
    expect(mocks.map.removeControl).toHaveBeenCalledTimes(2);
  });
  it('does not add controls after unmount while their imports are pending', async () => {
    const view = render(<ExplorerMap results={[]} onSelectionChange={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Load Map Controls' }));
      view.unmount();
    });
    expect(mocks.map.addControl).not.toHaveBeenCalled();
  });
  it('uses the latest selection callback after navigation and clears the drawn area', async () => {
    const original = vi.fn(); const current = vi.fn();
    const view = render(<ExplorerMap results={[]} onSelectionChange={original} selection={{ type: 'radius', data: '32,-97,5' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load Map Controls' }));
    await waitFor(() => expect(mocks.map.addControl).toHaveBeenCalledTimes(1));
    view.rerender(<ExplorerMap results={[]} onSelectionChange={current} selection={null} />);
    const deleted = mocks.map.on.mock.calls.find(([name]: [string]) => name === 'draw.delete')[1];
    act(() => deleted());
    expect(current).toHaveBeenCalledWith(null);
    expect(original).not.toHaveBeenCalled();
    expect(mocks.draw.mock.results[0].value.deleteAll).toHaveBeenCalledTimes(1);
  });
  it('recovers asynchronous control failures and Mapbox errors', async () => {
    mocks.directions.mockImplementationOnce(function () { throw new Error('Directions setup failed'); });
    const unavailable = vi.fn();
    render(<ExplorerMap results={[]} onSelectionChange={vi.fn()} onUnavailable={unavailable} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load Map Controls' }));
    await screen.findByRole('button', { name: 'Retry Map' });
    expect(unavailable).toHaveBeenCalledTimes(1);
    expect(mocks.map.removeControl).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Retry Map' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fail Map Renderer' }));
    expect(screen.getByRole('button', { name: 'Retry Map' })).toBeInTheDocument();
    expect(unavailable).toHaveBeenCalledTimes(2);
  });
});
