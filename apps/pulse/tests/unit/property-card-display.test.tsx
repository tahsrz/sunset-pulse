import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Property } from '@/lib/types';
import PropertyCard from '@/components/PropertyCard';

vi.mock('@/components/SafePropertyImage', () => ({
  default: () => null,
}));

const property: Property = {
  _id: 'listing-1',
  name: 'A home with a long address',
  type: 'Residential',
  source: 'MLS',
  location: { city: 'Port Charlotte', state: 'FL' },
  images: [],
  beds: 3,
  baths: 2,
  rates: { nightly: 0, weekly: 0, monthly: 0 },
};

afterEach(cleanup);

describe('property card display', () => {
  it('does not render stray zero rate labels or invent a nightly price', () => {
    render(<PropertyCard property={property} />);
    expect(screen.getByText('Price on request')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.queryByText(/Nightly|Weekly|Monthly/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Map' })).toHaveAttribute('href', '/explorer?id=listing-1');
    expect(screen.getByRole('link', { name: 'Details' })).toHaveAttribute('href', '/listings/listing-1');
  });

  it('preserves monthly rental pricing and valid map coordinates', () => {
    render(<PropertyCard property={{
      ...property,
      rates: { monthly: 1550 },
      location_geo: { type: 'Point', coordinates: [-97.25, 32.93] },
    }} />);
    expect(screen.getByText('$1,550/mo')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Map' })).toHaveAttribute('href', '/explorer?id=listing-1&lat=32.93&lng=-97.25');
  });

  it('prefers the list price and retains internal property navigation', () => {
    render(<PropertyCard property={{ ...property, source: 'Internal', list_price: 285000, price: 200000 }} />);
    expect(screen.getByText('$285,000')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Details' })).toHaveAttribute('href', '/properties/listing-1');
  });
});
