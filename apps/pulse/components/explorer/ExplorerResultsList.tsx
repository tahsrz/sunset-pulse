import React from 'react';
import Link from 'next/link';
import type { PublicListing } from '@/lib/data/publicListingContract';
import { listingPrice, validCoordinates } from '@/lib/explorer/listingGeometry';

export function ExplorerResultsList({ listings }: { listings: PublicListing[] }) {
  const prices = listings.map(listingPrice);
  const sale = prices.filter(price => price.kind === 'sale' && price.amount !== null);
  const rent = prices.filter(price => price.kind === 'monthly' && price.amount !== null);
  const countLabel = (count: number) => `${count} ${count === 1 ? 'listing' : 'listings'}`;
  const average = (sample: typeof prices) => Math.round(sample.reduce((sum, price) => sum + (price.amount ?? 0), 0) / sample.length).toLocaleString('en-US');
  return <section aria-labelledby="explorer-results-title" className="space-y-5">
    <h2 id="explorer-results-title" className="text-xl uppercase">Properties in This Search</h2>
    <p className="text-sm text-slate-300">{listings.length} returned {listings.length === 1 ? 'listing' : 'listings'}. These results are a sample, not a market-wide report.</p>
    <dl className="space-y-3 text-sm">
      {sale.length > 0 && <div><dt>Average sale asking price ({countLabel(sale.length)})</dt><dd className="text-lg text-cyan-200">${average(sale)}</dd></div>}
      {rent.length > 0 && <div><dt>Average monthly rent ({countLabel(rent.length)})</dt><dd className="text-lg text-cyan-200">${average(rent)}/mo</dd></div>}
    </dl>
    <ul className="divide-y divide-white/15">
      {listings.map(listing => <li key={listing.id} className="space-y-2 py-5">
        <h3 className="text-lg"><Link className="underline decoration-cyan-200/50 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" href={`/properties/${encodeURIComponent(listing.id)}`}>{listing.name}</Link></h3>
        <p className="text-sm text-slate-300">{[listing.location.street, listing.location.city, listing.location.state].filter(Boolean).join(', ')}</p>
        <p>{listingPrice(listing).label}</p>
        {!validCoordinates(listing.location_geo?.coordinates) && <p className="text-sm text-slate-400">Map location not listed.</p>}
      </li>)}
    </ul>
  </section>;
}
