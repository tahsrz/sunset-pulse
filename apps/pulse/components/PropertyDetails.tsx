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
import { kellerHicksListingId, kellerHicksZoningPacket } from '@/config/keller_hicks';
import type { Property } from '@/lib/types';

export default function PropertyDetails({ property, propertyId }: { property: Property; propertyId: string }) {
  const isShortTerm = property.type === 'RV' || property.type === 'RV Park';
  const isLand = property.type === 'Land';
  const canAskAboutLand = isLand && property.listing_status === 'Active';
  const isKellerHicks = propertyId === kellerHicksListingId;
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
            {canAskAboutLand && (
              <a href="#property-inquiry" className="inline-flex min-h-11 items-center rounded-lg bg-[#275e60] px-4 py-2 font-semibold text-white hover:bg-[#1b4749]">
                Ask about this property
              </a>
            )}
            {photos[0] && <PropertyHeaderImage image={photos[0]} propertyName={property.name} />}
            <PropertySpecs property={property} />
            {isKellerHicks && (
              <section aria-labelledby="development-details" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 sm:p-6">
                <h2 id="development-details" className="text-xl font-semibold text-slate-900">Land and development details</h2>
                <p>Approximately 5 acres as marketed. The August 2024 survey shows 4.866 acres and about 304 feet of Keller Hicks Road frontage.</p>
                <p>Fort Worth approved A-7.5 One-Family Residential zoning. The July 2025 concept illustrates eight single-family homesites and three open-space lots, subject to applicable approvals. Recorded plat status has not been verified.</p>
                <p>The concept maps a floodplain across part of the tract. The survey shows a gas pipeline marker near the frontage.</p>
                <a href={kellerHicksZoningPacket} className="inline-block font-semibold text-[#275e60] underline">View the city zoning packet, survey and concept plan</a>
              </section>
            )}
          </div>
          <div className="contents lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block lg:space-y-5">
            {(!isLand || canAskAboutLand) && (
              <aside id="property-inquiry" aria-label="Listing contact" tabIndex={-1} className="min-w-0 scroll-mt-24">
                {isShortTerm ? (
                  <BookingForm property={property} />
                ) : (
                  <PropertySidebarForms key={propertyId} propertyId={propertyId} propertyName={property.name} />
                )}
              </aside>
            )}
            <div className="order-last min-w-0 space-y-5 lg:order-none">
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                {!isShortTerm && !isLease && !isLand && <DraftOfferButton property={property} />}
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
