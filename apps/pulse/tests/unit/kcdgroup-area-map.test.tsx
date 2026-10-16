import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import KcdGroupAreaMap from '@/components/sites/KcdGroupAreaMap';

vi.mock('react-map-gl', () => ({
  default: ({ children, initialViewState }: { children: React.ReactNode; initialViewState: { latitude: number; longitude: number } }) => (
    <div data-testid="area-map" data-latitude={initialViewState.latitude} data-longitude={initialViewState.longitude}>
      {children}
    </div>
  ),
  Marker: ({ children }: { children: React.ReactNode }) => <div data-testid="map-marker">{children}</div>,
  NavigationControl: () => <div aria-label="Map navigation controls" />,
  Popup: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div>,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('KCD Group area map', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'test-token');
  });

  it('centers on Arlington Plaza and opens its address from the map marker', () => {
    render(<KcdGroupAreaMap />);

    expect(screen.getByTestId('area-map')).toHaveAttribute('data-latitude', '32.735377');
    expect(screen.getByTestId('area-map')).toHaveAttribute('data-longitude', '-97.117832');
    expect(screen.getByRole('link', { name: /open in explorer/i })).toHaveAttribute(
      'href',
      'https://www.sunsetpulse.app/explorer?lat=32.735377&lng=-97.117832',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show Arlington Plaza address on map' }));

    expect(screen.getByRole('dialog')).toHaveTextContent('808 W Abram St, Arlington, TX 76013');
    expect(screen.getByRole('link', { name: 'Get directions' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=808%20W%20Abram%20St%2C%20Arlington%2C%20TX%2076013',
    );
  });
});
