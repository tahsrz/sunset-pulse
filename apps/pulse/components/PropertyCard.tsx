'use client';

import React from 'react';
import Link from 'next/link';
import SafePropertyImage from '@/components/SafePropertyImage';
import {
  FaBed,
  FaBath,
  FaRulerCombined,
  FaMoneyBill,
  FaMapMarker,
  FaBus,
  FaTrailer,
  FaPlug,
  FaRoute,
  FaGlobeAmericas
} from 'react-icons/fa';
import { Property } from '@/lib/types';

interface PropertyCardProps {
  property: Property;
  onRouteClick?: ((property: Property) => void) | null;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onRouteClick = null }) => {
  const popularityScore = (property as any).popularityScore || 0;
  const rates = property.rates || {};
  const intensity = ((property.leadCount || 0) / (property.globalAvgLeads || 5)) * 1.5;
  const isHighIntensity = intensity > 1.2 || popularityScore > 60;
  const isUrgent = (property.leadCount || 0) > 10;

  const getRateDisplay = () => {
    const { price, list_price, price_type } = property;
    const primaryPrice = (list_price && list_price > 0) ? list_price : price;

    if (primaryPrice && primaryPrice > 0) {
      return primaryPrice.toLocaleString();
    }

    if (price_type === 'lease' && rates.monthly) {
      return `${rates.monthly.toLocaleString()}/mo`;
    }

    if (rates.monthly) {
      return `${rates.monthly.toLocaleString()}/mo`;
    } else if (rates.weekly) {
      return `${rates.weekly.toLocaleString()}/wk`;
    } else if (rates.nightly) {
      return `${rates.nightly.toLocaleString()}/night`;
    }
    return null;
  };

  const isRV = property.type === 'RV' || property.type === 'RV Park';
  const isInternal = property.source === 'Internal' || !property.source;
  const rateDisplay = getRateDisplay();
  const hasRentalRates = Boolean(rates.nightly || rates.weekly || rates.monthly);
  const coordinates = property.location_geo?.coordinates;
  const mapParams = new URLSearchParams({ id: String(property._id) });
  if (coordinates && Number.isFinite(coordinates[0]) && Number.isFinite(coordinates[1])) {
    mapParams.set('lat', String(coordinates[1]));
    mapParams.set('lng', String(coordinates[0]));
  }

  return (
    <div className={`property-card flex h-full min-w-0 flex-col overflow-hidden rounded-2xl shadow-md relative bg-white transition-all duration-500 ${isHighIntensity ? 'hover:scale-[1.02]' : ''}`}
      style={{
        boxShadow: isHighIntensity ? `0 0 ${20 * intensity}px rgba(59, 130, 246, ${0.1 * intensity})` : 'none',
        border: isUrgent ? '2px solid rgba(239, 68, 68, 0.5)' : 'none',
      }}
    >
      {isHighIntensity && (
        <div className='absolute top-10 left-2 bg-blue-600 text-white text-[10px] font-semibold px-2 py-1 rounded-full z-10'>
          {popularityScore > 75 ? '🔥 Trending' : 'High Intensity'}
        </div>
      )}

      {isInternal ? (
        <div className='absolute top-2 left-2 bg-green-700 text-white text-[10px] font-semibold px-2 py-1 rounded shadow-lg z-10'>
          Sunset Pulse Verified
        </div>
      ) : (
        <div className='absolute top-2 left-2 bg-slate-800 text-white text-[10px] font-semibold px-2 py-1 rounded shadow-lg z-10 flex items-center gap-1'>
          <FaGlobeAmericas className="text-blue-400" /> Global MLS Search
        </div>
      )}

      <SafePropertyImage
        src={property.images?.[0]}
        fallbackSrc="/images/property-placeholder.svg"
        alt={`${property.name} listing photo`}
        fallbackAlt={`Listing photo unavailable for ${property.name}`}
        height={360}
        width={640}
        sizes='(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw'
        className='w-full h-auto rounded-t-xl object-cover aspect-video'
      />
      <div className='flex flex-1 flex-col p-5'>
        <div className='mb-3 min-w-0 text-left'>
          <div className='text-gray-600 text-xs uppercase font-bold tracking-widest'>{property.type}</div>
          <h3 className='mt-2 line-clamp-2 min-h-12 text-base font-semibold leading-6 text-slate-900' title={property.name}>{property.name}</h3>
        </div>
        <p className='mb-4 text-xl font-bold tabular-nums text-blue-700'>
          {rateDisplay ? `$${rateDisplay}` : 'Price on request'}
        </p>

        <div className='mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-5 text-slate-600'>
          {isRV ? (
            <>
              <div className='flex items-center'>
                {property.rv_type?.includes('Class') ? <FaBus className='inline mr-2' /> : <FaTrailer className='inline mr-2' />}
                <span className='md:hidden lg:inline'>{property.rv_type || 'RV'}</span>
              </div>
              {Boolean(property.rv_length) && (
                <div className='flex items-center'>
                  <FaRulerCombined className='inline mr-2' />
                  {property.rv_length} <span className='md:hidden lg:inline'>ft</span>
                </div>
              )}
              {property.hookups?.electric !== 'None' && property.hookups?.electric && (
                <div className='flex items-center' title={`Electric: ${property.hookups.electric}`}>
                  <FaPlug className='inline mr-2 text-yellow-600' />
                  <span className='md:hidden lg:inline'>{property.hookups.electric}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className='flex items-center gap-1.5'>
                <FaBed className='shrink-0' />
                <span>{property.beds ?? '—'} beds</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <FaBath className='shrink-0' />
                <span>{property.baths ?? '—'} baths</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <FaRulerCombined className='shrink-0' />
                <span>{property.square_feet?.toLocaleString() ?? '—'} sqft</span>
              </div>
            </>
          )}
        </div>

        {hasRentalRates ? <div className='flex flex-wrap gap-4 text-green-900 text-xs mb-4'>
          {Boolean(rates.nightly) && (
            <div className='flex items-center'>
              <FaMoneyBill className='inline mr-2' /> Nightly
            </div>
          )}

          {Boolean(rates.weekly) && (
            <div className='flex items-center'>
              <FaMoneyBill className='inline mr-2' /> Weekly
            </div>
          )}

          {Boolean(rates.monthly) && (
            <div className='flex items-center'>
              <FaMoneyBill className='inline mr-2' /> Monthly
            </div>
          )}
        </div> : null}

        <div className='mt-auto flex flex-col gap-3 border-t border-slate-100 pt-4'>
          <div className='flex min-h-10 items-start gap-2'>
            <FaMapMarker className='text-orange-700 mt-1 shrink-0' />
            <span className='text-slate-700 text-sm leading-5'>
              {' '}
              {property.location.city}, {property.location.state}{' '}
            </span>
          </div>
          <div className='flex gap-2'>
            {onRouteClick && (
              <button
                type="button"
                aria-label={`Route to ${property.name}`}
                onClick={(e) => {
                  e.preventDefault();
                  onRouteClick(property);
                }}
                className='bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-center text-xs flex items-center justify-center transition-all'
                title='Route to Property'
              >
                <FaRoute />
              </button>
            )}
            <Link
              href={`/explorer?${mapParams.toString()}`}
              className='min-h-10 flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-center text-sm font-semibold flex items-center justify-center gap-2 transition-all'
            >
              <FaMapMarker /> Map
            </Link>
            <Link
              href={isInternal ? `/properties/${property._id}` : `/listings/${property._id}`}
              className='min-h-10 flex-1 inline-flex items-center justify-center hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-center text-sm font-semibold transition-all bg-blue-600'
            >
              Details
            </Link>
          </div>
        </div>

        {!isInternal && (
          <div className='mt-4 pt-3 border-t border-slate-100 space-y-2'>
            {property.listing_brokerage && (
              <p className='text-[10px] font-semibold text-slate-500 leading-4'>
                Listing Broker: <span className='text-slate-600'>{property.listing_brokerage}</span>
              </p>
            )}
            <p className='text-[10px] text-slate-500 leading-4'>
              The data relating to real estate for sale on this web site comes in part from the Internet Data Exchange program of NTREIS. Real estate listings held by brokerage firms other than Lion Drive Realty are marked with the NTREIS logo or the IDX logo and detailed information about them includes the name of the listing brokers. This information is deemed reliable but not guaranteed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyCard;
