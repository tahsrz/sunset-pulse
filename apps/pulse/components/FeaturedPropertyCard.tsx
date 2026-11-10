import React from 'react';
import Link from 'next/link';
import SafePropertyImage from '@/components/SafePropertyImage';
import {
  FaBed,
  FaBath,
  FaRulerCombined,
  FaMapMarker,
  FaFire,
  FaLeaf,
} from 'react-icons/fa';
import { Property } from '@/lib/types';

interface FeaturedPropertyCardProps {
  property: Property;
  stacked?: boolean;
}

const FeaturedPropertyCard: React.FC<FeaturedPropertyCardProps> = ({ property, stacked = false }) => {
  const popularityScore = (property as any).popularityScore || 0;
  const yieldIntel = (property as any).yieldIntel;

  const getRateDisplay = () => {
    const value = property.list_price || property.price || property.rates?.monthly || property.rates?.nightly || 0;
    return value ? value.toLocaleString() : 'N/A';
  };

  return (
    <div className={`waterlily-card relative flex flex-col overflow-hidden group ${stacked ? '' : 'rounded-2xl md:flex-row'}`}>
      <SafePropertyImage
        src={property.images?.[0]}
        alt={`${property.name} listing photo`}
        fallbackSrc="/images/property-placeholder.svg"
        fallbackAlt={`Listing photo unavailable for ${property.name}`}
        width={stacked ? 640 : 0}
        height={stacked ? 360 : 0}
        sizes={stacked ? '(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw' : '100vw'}
        className={stacked ? 'aspect-video h-auto max-h-64 w-full border-b border-white/15 object-cover' : 'object-cover w-full md:w-2/5 min-h-[240px] group-hover:scale-105 transition-transform duration-700'}
      />

      {/* Popularity Badge */}
      {popularityScore > 65 && (
        <div className='absolute top-4 left-4 z-10 flex items-center gap-2 bg-orange-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-lg animate-bounce'>
          <FaFire /> Trending
        </div>
      )}

      <div className={`flex min-w-0 flex-grow flex-col ${stacked ? 'p-4' : 'p-6'}`}>
        <div className='mb-2 flex items-start justify-between gap-3'>
          <div>
            <h3 className={stacked ? 'break-words text-base font-semibold text-white' : 'text-xl font-black text-white uppercase tracking-tight'}>{property.name}</h3>
            <div className='text-teal-100/50 text-[10px] font-black uppercase tracking-[0.2em]'>{property.type}</div>
          </div>
          <div className='text-right'>
            <div className='text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1'>Pulse Score</div>
            <div className='text-xl font-black text-blue-400 italic'>{(property as any).pulseScore || 50}</div>
          </div>
        </div>

        <p className={stacked ? 'mt-2 font-mono text-xl font-semibold tabular-nums text-slate-100' : 'absolute top-4 left-4 bg-[#102a3a]/95 backdrop-blur-md border border-amber-200/25 px-4 py-2 rounded-lg text-amber-100 font-black shadow-xl z-20'}>
          ${getRateDisplay()}
        </p>

        <div className='my-4 flex flex-wrap gap-x-4 gap-y-2 border-y border-white/15 py-3 text-slate-300'>
          <div className='flex items-center gap-2'>
            <FaBed className='text-blue-400' /> <span className='font-bold'>{property.beds}</span>
          </div>
          <div className='flex items-center gap-2'>
            <FaBath className='text-blue-400' /> <span className='font-bold'>{property.baths}</span>
          </div>
          <div className='flex items-center gap-2'>
            <FaRulerCombined className='text-blue-400' /> <span className='font-bold'>{property.square_feet}</span>
          </div>
        </div>

        {yieldIntel && (
          <div className='mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between'>
            <div className='flex items-center gap-2 text-emerald-400 text-[9px] font-black uppercase tracking-widest'>
              <FaLeaf /> Yield Intelligence
            </div>
            <div className='text-[10px] font-bold text-emerald-100'>
              {yieldIntel.cornYield} BU/AC (Corn)
            </div>
          </div>
        )}

        <div className={`mt-auto flex flex-col gap-4 ${stacked ? 'items-start' : 'items-center justify-between lg:flex-row'}`}>
          <div className='flex align-middle gap-2'>
            <FaMapMarker className='text-rose-400' />
            <span className='text-slate-300 font-bold text-sm uppercase tracking-wide'>
              {property.location.city}, {property.location.state}
            </span>
          </div>

          <div className={`flex w-full flex-wrap items-center gap-3 ${stacked ? '' : 'lg:w-auto'}`}>
            <div className='flex flex-col items-end'>
              <div className='text-[7px] font-black text-slate-500 uppercase tracking-widest'>Popularity</div>
              <div className='h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden'>
                <div
                  className='h-full bg-orange-500 transition-all duration-1000'
                  style={{ width: `${popularityScore}%` }}
                />
              </div>
            </div>
            <Link
              href={`/properties/${property._id}`}
              className='waterlily-button text-white px-6 py-2 rounded-full text-center text-[10px] font-black uppercase tracking-widest'
            >
              Intelligence Dossier
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedPropertyCard;
