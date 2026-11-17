import { Property } from '@/lib/types';

const dollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
});

export default function PropertyHeader({ property, price }: { property: Property; price?: number }) {
  const { location, listing_status } = property;
  const locality = [location.city, location.state].filter(Boolean).join(', ');
  const postalCity = [locality, location.zipcode].filter(Boolean).join(' ');
  const address = [location.street, postalCity].filter(Boolean).join(', ');
  const isLease = property.price_type === 'lease';
  const rentalRates = property.price_type !== 'sale' && !isLease
    ? [
        { label: 'Nightly', value: property.rates?.nightly ?? 0 },
        { label: 'Weekly', value: property.rates?.weekly ?? 0 },
        { label: 'Monthly', value: property.rates?.monthly ?? 0 },
      ].filter(({ value }) => value > 0)
    : [];

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600">
          <span>{property.type}</span>
          {listing_status && (
            <span className="rounded-full bg-[#dcefee] px-2.5 py-0.5 text-xs font-semibold text-[#245757]">
              {listing_status}
            </span>
          )}
        </div>
        <h1 className="mt-2 break-words font-serif text-3xl !font-normal !not-italic !normal-case leading-tight text-slate-900 sm:text-4xl">
          {property.name}
        </h1>
        {address && <p className="mt-2 text-sm leading-6 text-slate-600">{address}</p>}
      </div>
      {price !== undefined && (
        <div>
          <p className="text-sm font-medium text-slate-600">{isLease ? 'Monthly rent' : 'Listing price'}</p>
          <p className="text-3xl font-semibold tabular-nums text-slate-900">{dollars.format(price)}</p>
        </div>
      )}
      {rentalRates.length > 0 && (
        <dl className="flex w-full flex-wrap gap-x-6 gap-y-2">
          {rentalRates.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-sm text-slate-600">{label}</dt>
              <dd className="font-semibold tabular-nums text-slate-900">{dollars.format(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </header>
  );
}
