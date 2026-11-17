'use client';

import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { Property } from '@/lib/types';

const unitPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
const areaNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 });
const percentage = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });

export default function PropertyAnalysis({ property, price }: { property: Property; price?: number }) {
  const [amount, setAmount] = useState('');
  const isLease = property.price_type === 'lease';
  const area = property.square_feet ?? 0;
  const pricePerFoot = price !== undefined && area > 0 ? price / area : null;
  const mlsId = property.mls_id || property.mls_number;
  const data = property.facts;
  const lotArea = [
    data?.lot_size_sqft ? `${areaNumber.format(data.lot_size_sqft)} sq ft` : '',
    data?.lot_size_acres ? `${areaNumber.format(data.lot_size_acres)} ${data.lot_size_acres === 1 ? 'acre' : 'acres'}` : '',
  ].filter(Boolean).join(' · ');
  const facts = [
    { label: isLease ? 'Monthly rent per sq ft' : 'Price per sq ft', value: pricePerFoot !== null ? unitPrice.format(pricePerFoot) : null },
    { label: 'Property subtype', value: data?.property_subtype },
    { label: 'Year built', value: data?.year_built ?? (property.year_built || null) },
    { label: 'Lot size', value: lotArea },
    { label: 'Lot dimensions', value: data?.lot_dimensions },
    { label: 'Subdivision', value: data?.subdivision },
    { label: 'Levels', value: data?.levels },
    { label: 'Builder', value: data?.builder },
    { label: 'MLS ID', value: mlsId },
  ].filter(({ value }) => value !== undefined && value !== null && value !== '');
  const { street, city, state, zipcode } = property.location;
  const mapHref = street && city
    ? 'https://www.google.com/maps/search/?' + new URLSearchParams({
        api: '1',
        query: [street, city, state, zipcode].filter(Boolean).join(', '),
      })
    : null;

  const comparisonPrice = Math.round(Number(amount) * 100) / 100;
  const validAmount = comparisonPrice >= 0.01 && comparisonPrice <= 1_000_000_000_000;
  const difference = validAmount && price !== undefined
    ? Math.round((comparisonPrice - price) * 100) / 100
    : null;
  const asking = isLease ? 'the listed monthly rent' : 'the asking price';

  if (!facts.length && price === undefined && !mapHref) return null;

  return (
    <section aria-labelledby="property-analysis-heading" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 id="property-analysis-heading" className="text-xl font-semibold !not-italic !normal-case text-slate-900">Property analysis</h2>
      {facts.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 sm:gap-x-6">
          {facts.map(({ label, value }) => (
            <div key={label} className="min-w-0">
              <dt className="text-sm text-slate-600">{label}</dt>
              <dd className="mt-0.5 break-words text-base font-semibold tabular-nums text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {pricePerFoot !== null && (
        <details className="mt-4 text-sm text-slate-600">
          <summary className="cursor-pointer font-medium text-[#275e60]">How this is calculated</summary>
          <p className="mt-2">{isLease ? 'Monthly asking rent' : 'Asking price'} divided by the square footage reported in the listing.</p>
        </details>
      )}
      {price !== undefined && (
        <details className="mt-4 rounded-xl border border-[#dbe8e8] bg-[#f2f8f8] p-4">
          <summary className="cursor-pointer font-semibold text-[#245757]">{isLease ? 'Compare monthly rent' : 'Compare a price'}</summary>
          <label className="mt-4 block max-w-xs space-y-1 text-sm font-medium text-slate-700">
            <span>{isLease ? 'Comparison monthly rent ($)' : 'Comparison price ($)'}</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              max="1000000000000"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-[#275e60] focus:ring-2 focus:ring-[#275e60]/30"
            />
          </label>
          <div aria-live="polite" className="mt-3 space-y-1 text-sm leading-6 text-slate-700">
            {difference !== null ? (
              <>
                <p>
                  {difference === 0
                    ? `Matches ${asking}.`
                    : `${dollars.format(Math.abs(difference))} (${percentage.format(Math.abs(difference) / price)}) ${difference < 0 ? 'below' : 'above'} ${asking}.`}
                </p>
                {area > 0 && (
                  <p><strong>{unitPrice.format(comparisonPrice / area)}</strong> per sq ft{isLease ? ' per month' : ''}.</p>
                )}
              </>
            ) : amount !== '' ? <p>Enter a positive amount up to $1,000,000,000,000.</p> : null}
          </div>
        </details>
      )}
      {mapHref && (
        <a href={mapHref} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 font-semibold text-[#275e60] hover:underline">
          View on Google Maps <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      )}
    </section>
  );
}
