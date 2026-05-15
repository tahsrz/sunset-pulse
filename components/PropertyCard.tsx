'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
  const intensity = ((property.leadCount || 0) / (property.globalAvgLeads || 5)) * 1.5;
  const isHighIntensity = intensity > 1.2;
  const isUrgent = (property.leadCount || 0) > 10;

  const getRateDisplay = () => {
    const { rates } = property;

    if (rates.monthly) {
      return `${rates.monthly.toLocaleString()}/mo`;
    } else if (rates.weekly) {
      return `${rates.weekly.toLocaleString()}/wk`;
    } else if (rates.nightly) {
      return `${rates.nightly.toLocaleString()}/night`;
    }
    return '0/night';
  };

  const isRV = property.type === 'RV' || property.type === 'RV Park';
  const isInternal = property.source === 'Internal' || !property.source;

  return (
    <div className={`property-card rounded-xl shadow-md relative bg-white transition-all duration-500 ${isHighIntensity ? 'hover:scale-[1.02]' : ''}`}
      style={{
        boxShadow: isHighIntensity ? `0 0 ${20 * intensity}px rgba(59, 130, 246, ${0.1 * intensity})` : 'none',
        border: isUrgent ? '2px solid rgba(239, 68, 68, 0.5)' : 'none',
      }}
    >
      <style jsx>{`
        @keyframes pulse-border {
          0% { border-color: rgba(239, 68, 68, 0.5); }
          50% { border-color: rgba(239, 68, 68, 1); box-shadow: 0 0 15px rgba(239, 68, 68, 0.4); }
          100% { border-color: rgba(239, 68, 68, 0.5); }
        }
      `}</style>
      
      {isHighIntensity && (
        <div className='absolute -top-2 -left-2 bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter z-10 animate-bounce'>
          High Intensity
        </div>
      )}

      {isInternal ? (
        <div className='absolute top-2 left-2 bg-green-500 text-white text-[8px] font-black px-2 py-1 rounded shadow-lg uppercase tracking-widest z-10'>
          Sunset Pulse Verified
        </div>
      ) : (
        <div className='absolute top-2 left-2 bg-slate-800 text-white text-[8px] font-black px-2 py-1 rounded shadow-lg uppercase tracking-widest z-10 flex items-center gap-1'>
          <FaGlobeAmericas className="text-blue-400" /> Global MLS Search
        </div>
      )}

      <Image
        src={property.images?.[0] || '/images/property-placeholder.jpg'}
        alt=''
        height={0}
        width={0}
        sizes='100vw'
        className='w-full h-auto rounded-t-xl object-cover aspect-video'
      />
      <div className='p-4'>
        <div className='text-left md:text-center lg:text-left mb-6'>
          <div className='text-gray-600 text-xs uppercase font-bold tracking-widest'>{property.type}</div>
          <h3 className='text-xl font-bold text-slate-900 truncate' title={property.name}>{property.name}</h3>
        </div>
        <h3 
          className='absolute top-[10px] right-[10px] bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg font-black text-right md:text-center lg:text-right shadow-lg text-blue-600'
        >
          ${getRateDisplay()}
        </h3>

        <div className='flex justify-center gap-4 text-gray-500 mb-4'>
          {isRV ? (
            <>
              <div className='flex items-center'>
                {property.rv_type?.includes('Class') ? <FaBus className='inline mr-2' /> : <FaTrailer className='inline mr-2' />}
                <span className='md:hidden lg:inline'>{property.rv_type || 'RV'}</span>
              </div>
              {property.rv_length && (
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
              <div className='flex items-center'>
                <FaBed className='inline mr-2' /> {property.beds}{' '}
                <span className='md:hidden lg:inline'>Beds</span>
              </div>
              <div className='flex items-center'>
                <FaBath className='inline mr-2' />
                {property.baths} <span className='md:hidden lg:inline'>Baths</span>
              </div>
              <div className='flex items-center'>
                <FaRulerCombined className='inline mr-2' />
                {property.square_feet}{' '}
                <span className='md:hidden lg:inline'>sqft</span>
              </div>
            </>
          )}
        </div>

        <div className='flex justify-center gap-4 text-green-900 text-sm mb-4'>
          {property.rates.nightly && (
            <div className='flex items-center'>
              <FaMoneyBill className='inline mr-2' /> Nightly
            </div>
          )}

          {property.rates.weekly && (
            <div className='flex items-center'>
              <FaMoneyBill className='inline mr-2' /> Weekly
            </div>
          )}

          {property.rates.monthly && (
            <div className='flex items-center'>
              <FaMoneyBill className='inline mr-2' /> Monthly
            </div>
          )}
        </div>

        <div className='border border-gray-100 mb-5'></div>

        <div className='flex flex-col lg:flex-row justify-between mb-4 gap-2'>
          <div className='flex align-middle gap-2 mb-4 lg:mb-0'>
            <FaMapMarker className='text-orange-700 mt-1' />
            <span className='text-orange-700 text-sm'>
              {' '}
              {property.location.city}, {property.location.state}{' '}
            </span>
          </div>
          <div className='flex gap-2'>
            {onRouteClick && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onRouteClick(property);
                }}
                className='bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-center text-xs flex items-center justify-center transition-all'
                title='Route to Asset'
              >
                <FaRoute />
              </button>
            )}
            <Link
              href={`/explorer?lat=${property.location_geo?.coordinates[1]}&lng=${property.location_geo?.coordinates[0]}&id=${property._id}`}
              className='bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-center text-xs flex items-center gap-1 transition-all'
            >
              <FaMapMarker /> Map
            </Link>
            <Link
              href={isInternal ? `/properties/${property._id}` : `/listings/${property._id}`}
              className='hover:opacity-90 text-white px-4 py-2 rounded-lg text-center text-xs transition-all bg-blue-600'
            >
              Details
            </Link>
          </div>
        </div>

        {!isInternal && (
          <div className='mt-4 pt-3 border-t border-slate-100 space-y-2'>
            {property.listing_brokerage && (
              <p className='text-[7px] font-black text-slate-400 uppercase tracking-widest leading-tight'>
                Listing Broker: <span className='text-slate-600'>{property.listing_brokerage}</span>
              </p>
            )}
            <p className='text-[6px] text-slate-400 italic leading-[1.4]'>
              The data relating to real estate for sale on this web site comes in part from the Internet Data Exchange program of NTREIS. Real estate listings held by brokerage firms other than Lion Drive Realty are marked with the NTREIS logo or the IDX logo and detailed information about them includes the name of the listing brokers. This information is deemed reliable but not guaranteed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyCard;
