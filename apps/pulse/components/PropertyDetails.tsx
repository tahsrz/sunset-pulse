import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import BookmarkButton from './BookmarkButton';
import BookingForm from './BookingForm';
import DraftOfferButton from './contracts/DraftOfferButton';
import PropertyHeaderImage from './PropertyHeaderImage';
import PropertyImages from './PropertyImages';
import PropertyHeader from './property/PropertyHeader';
import PropertySidebarForms from './property/PropertySidebarForms';
import PropertySpecs from './property/PropertySpecs';
import RecommendedProperties from './property/RecommendedProperties';
import ShareButtons from './ShareButtons';
import type { Property } from '@/lib/types';

const unitPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function PropertyDetails({ property, propertyId }: { property: Property; propertyId: string }) {
  const isShortTerm = property.type === 'RV' || property.type === 'RV Park';
  const isLease = property.price_type === 'lease';
  const price = (isLease
    ? [property.rates?.monthly, property.price, property.list_price]
    : [property.list_price, property.price]
  ).find((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
  const area = property.square_feet ?? 0;
  const pricePerFoot = price !== undefined && area > 0 && !isShortTerm ? price / area : null;
  const mlsId = property.mls_id || property.mls_number;
  const mapHref = property.location.street && property.location.city
    ? 'https://www.google.com/maps/search/?' + new URLSearchParams({
        api: '1',
        query: [property.location.street, property.location.city, property.location.state, property.location.zipcode].filter(Boolean).join(', '),
      })
    : null;
  const photos = property.images.filter(Boolean);

  return (
    <main className="min-h-screen bg-[#f4f8f9] pb-16 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        <Link href="/properties" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#275e60] hover:underline">
          <ArrowLeft size={16} aria-hidden="true" /> Back to properties
        </Link>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,23rem)] lg:grid-rows-[auto_1fr] lg:gap-x-8">
          <div className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-1">
            <PropertyHeader property={property} price={price} />
            {photos[0] && <PropertyHeaderImage image={photos[0]} propertyName={property.name} />}
            <PropertySpecs property={property} />
          </div>
          <div className="contents lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block lg:space-y-5">
            <aside aria-label="Listing contact" className="min-w-0">
              {isShortTerm ? (
                <BookingForm property={property} />
              ) : (
                <PropertySidebarForms key={propertyId} propertyId={propertyId} propertyName={property.name} />
              )}
            </aside>
            <div className="order-last min-w-0 space-y-5 lg:order-none">
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                {!isShortTerm && !isLease && <DraftOfferButton property={property} />}
                <BookmarkButton property={property} />
                <ShareButtons property={property} />
              </div>
              <RecommendedProperties currentPropertyId={propertyId} type={property.type} />
            </div>
          </div>
          <div className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-2">
            {(pricePerFoot !== null || mlsId || mapHref) && (
              <section aria-labelledby="property-analysis-heading" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <h2 id="property-analysis-heading" className="text-xl font-semibold !not-italic !normal-case text-slate-900">Property analysis</h2>
                {(pricePerFoot !== null || mlsId) && (
                  <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-4">
                    {pricePerFoot !== null && (
                      <div>
                        <dt className="text-sm text-slate-600">{isLease ? 'Monthly rent per sq ft' : 'Price per sq ft'}</dt>
                        <dd className="mt-0.5 text-lg font-semibold tabular-nums">{unitPrice.format(pricePerFoot)}</dd>
                      </div>
                    )}
                    {mlsId && (
                      <div>
                        <dt className="text-sm text-slate-600">MLS ID</dt>
                        <dd className="mt-0.5 break-all text-lg font-semibold">{mlsId}</dd>
                      </div>
                    )}
                  </dl>
                )}
                {pricePerFoot !== null && (
                  <details className="mt-4 text-sm text-slate-600">
                    <summary className="cursor-pointer font-medium text-[#275e60]">How this is calculated</summary>
                    <p className="mt-2">{isLease ? 'Monthly asking rent' : 'Asking price'} divided by the square footage reported in the listing.</p>
                  </details>
                )}
                {mapHref && (
                  <a href={mapHref} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 font-semibold text-[#275e60] hover:underline">
                    View on Google Maps <ArrowUpRight size={16} aria-hidden="true" />
                  </a>
                )}
              </section>
            )}
            {photos.length > 1 && (
              <section aria-labelledby="listing-photos-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <h2 id="listing-photos-heading" className="mb-4 text-xl font-semibold !not-italic !normal-case text-slate-900">Listing photos</h2>
                <PropertyImages images={photos} />
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
