'use client';

import Link from 'next/link';
import Image from 'next/image';
import { isRemoteImageSource } from '@/lib/imageSource';
import { useProperties } from '@/hooks/useProperties';
import type { Property } from '@/lib/types';

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
const fallbackPhoto = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=400&auto=format&fit=crop';

export default function RecommendedProperties({ currentPropertyId, type }: { currentPropertyId: string; type?: string }) {
  const { properties, loading } = useProperties();
  if (loading) return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;

  const recommended = properties
    .filter((property) => property._id !== currentPropertyId && (!type || property.type === type))
    .slice(0, 3);
  if (!recommended.length) return null;

  return (
    <section aria-labelledby="recommended-properties-heading" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 id="recommended-properties-heading" className="text-lg font-semibold !not-italic !normal-case text-slate-900">Related properties</h2>
      {recommended.map((property) => {
        const photo = property.images?.[0] || fallbackPhoto;
        const isLease = property.price_type === 'lease';
        const amount = isLease ? property.rates?.monthly || property.price : property.list_price || property.price;
        const rate = !amount && [
          { value: property.rates?.monthly ?? 0, period: '/mo' },
          { value: property.rates?.weekly ?? 0, period: '/wk' },
          { value: property.rates?.nightly ?? 0, period: '/night' },
        ].find(({ value }) => value > 0);
        const price = amount || (rate ? rate.value : 0);
        const period = isLease ? '/mo' : rate ? rate.period : '';
        const locality = [property.location?.city, property.location?.state].filter(Boolean).join(', ');

        return (
          <Link key={property._id} href={`/properties/${encodeURIComponent(property._id)}`} className="group block space-y-2">
            <div className="relative h-32 overflow-hidden rounded-xl bg-slate-100">
              <Image src={photo} unoptimized={isRemoteImageSource(photo)} alt="" fill sizes="(min-width: 1024px) 340px, 100vw" className="object-cover" />
              {price && price > 0 ? (
                <p className="absolute right-2 top-2 rounded-md bg-slate-950/85 px-2 py-1 text-xs font-semibold text-white">
                  {dollars.format(price)}{period}
                </p>
              ) : null}
            </div>
            <p className="text-sm font-semibold text-slate-900 group-hover:underline">{property.name}</p>
            {locality && <p className="text-xs text-slate-600">{locality}</p>}
          </Link>
        );
      })}
    </section>
  );
}
