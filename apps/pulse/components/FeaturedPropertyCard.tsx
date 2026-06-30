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
}

const FeaturedPropertyCard: React.FC<FeaturedPropertyCardProps> = ({ property }) => {
  const popularityScore = (property as any).popularityScore || 0;
  const yieldIntel = (property as any).yieldIntel;

  const getRateDisplay = () => {
    const value = property.list_price || property.price || property.rates?.monthly || property.rates?.nightly || 0;
    return value ? value.toLocaleString() : 'N/A';
  };

  return (
    <div className='waterlily-card rounded-2xl relative flex flex-col md:flex-row overflow-hidden group'>
      <SafePropertyImage
        src={property.images?.[0]}
        alt={`${property.name} listing photo`}
        width={0}
        height={0}
        sizes='100vw'
        className='object-cover w-full md:w-2/5 min-h-[240px] group-hover:scale-105 transition-transform duration-700'
      />

      {/* Popularity Badge */}
      {popularityScore > 65 && (
        <div className='absolute top-4 left-4 z-10 flex items-center gap-2 bg-orange-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-lg animate-bounce'>
          <FaFire /> Trending
        </div>
      )}

      <div className='p-6 flex-grow'>
        <div className='flex justify-between items-start mb-2'>
          <div>
            <h3 className='text-xl font-black text-white uppercase tracking-tight'>{property.name}</h3>
            <div className='text-teal-100/50 text-[10px] font-black uppercase tracking-[0.2em]'>{property.type}</div>
          </div>
          <div className='text-right'>
            <div className='text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1'>Pulse Score</div>
            <div className='text-xl font-black text-blue-400 italic'>{(property as any).pulseScore || 50}</div>
          </div>
        </div>

        <h3 className='absolute top-[10px] right-[10px] md:right-auto md:left-[38%] bg-[#102a3a]/95 backdrop-blur-md border border-amber-200/25 px-4 py-2 rounded-lg text-amber-100 font-black shadow-xl z-20'>
          ${getRateDisplay()}
        </h3>

        <div className='flex gap-6 text-teal-100/75 my-6 border-y border-white/5 py-4'>
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

        <div className='flex flex-col lg:flex-row justify-between items-center gap-4 mt-auto'>
          <div className='flex align-middle gap-2'>
            <FaMapMarker className='text-rose-400' />
            <span className='text-slate-300 font-bold text-sm uppercase tracking-wide'>
              {property.location.city}, {property.location.state}
            </span>
          </div>

          <div className='flex items-center gap-4 w-full lg:w-auto'>
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
