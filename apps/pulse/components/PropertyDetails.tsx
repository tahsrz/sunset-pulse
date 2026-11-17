import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import BookmarkButton from './BookmarkButton';
import BookingForm from './BookingForm';
import DraftOfferButton from './contracts/DraftOfferButton';
import PropertyHeaderImage from './PropertyHeaderImage';
import PropertyImages from './PropertyImages';
import PropertyAnalysis from './property/PropertyAnalysis';
import PropertyHeader from './property/PropertyHeader';
import PropertySidebarForms from './property/PropertySidebarForms';
import PropertySpecs from './property/PropertySpecs';
import RecommendedProperties from './property/RecommendedProperties';
import ShareButtons from './ShareButtons';
import type { Property } from '@/lib/types';

export default function PropertyDetails({ property, propertyId }: { property: Property; propertyId: string }) {
  const isShortTerm = property.type === 'RV' || property.type === 'RV Park';
  const isLease = property.price_type === 'lease';
  const price = (isLease
    ? [property.rates?.monthly, property.price, property.list_price]
    : [property.list_price, property.price]
  ).find((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
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
            <PropertyAnalysis key={propertyId} property={property} price={isShortTerm ? undefined : price} />
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
