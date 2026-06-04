import Link from 'next/link';
import { FilePenLine } from 'lucide-react';
import { Property } from '@/lib/types';

type DraftOfferButtonProps = {
  property: Property;
  className?: string;
};

function getDraftOfferHref(property: Property) {
  const params = new URLSearchParams();
  const propertyAny = property as Property & {
    mls_number?: string;
    county?: string;
    location?: Property['location'] & { county?: string };
  };
  const address = [
    property.location?.street,
    property.location?.city,
    property.location?.state,
    property.location?.zipcode
  ].filter(Boolean).join(', ');
  const listPrice = property.list_price || property.price || property.rates?.monthly || 0;

  params.set('propertyId', property._id);
  params.set('source', 'listing');
  if (property.name) params.set('propertyName', property.name);
  if (address) params.set('address', address);
  if (property.location?.city) params.set('city', property.location.city);
  if (property.location?.state) params.set('state', property.location.state);
  if (propertyAny.location?.county || propertyAny.county) params.set('county', propertyAny.location?.county || propertyAny.county || '');
  if (propertyAny.mls_number) params.set('mlsNumber', propertyAny.mls_number);
  if (property.seller_info?.name) params.set('sellers', property.seller_info.name);
  if (property.listing_brokerage) params.set('brokerage', property.listing_brokerage);
  if (listPrice > 0) params.set('listPrice', String(listPrice));
  if (property.type) params.set('propertyType', property.type);
  if (property.year_built) params.set('yearBuilt', String(property.year_built));

  return `/contracts/promulgated/setup?${params.toString()}`;
}

export default function DraftOfferButton({ property, className = '' }: DraftOfferButtonProps) {
  return (
    <Link
      href={getDraftOfferHref(property)}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-emerald-600 ${className}`}
    >
      <FilePenLine size={15} />
      Draft Offer
    </Link>
  );
}
