'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Property {
  _id: string;
  name: string;
  images: string[];
  location: {
    city: string;
    state: string;
  };
}

interface PropertyAssetCardProps {
  property: Property;
  onDelete: (id: string) => void;
}

const PropertyAssetCard: React.FC<PropertyAssetCardProps> = ({ property, onDelete }) => {
  return (
    <div className='bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden group hover:border-blue-500/30 transition-all'>
      <Link href={`/properties/${property._id}`} className='relative h-48 block overflow-hidden'>
        <Image
          className='object-cover transition-transform duration-700 group-hover:scale-110'
          src={property.images[0]}
          alt={property.name}
          fill
        />
        <div className='absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-60' />
        <div className='absolute bottom-4 left-4 right-4'>
          <h3 className='text-lg font-bold truncate text-white'>{property.name}</h3>
          <p className='text-[10px] text-white/60 font-mono truncate uppercase'>
            {property.location.city}, {property.location.state}
          </p>
        </div>
      </Link>
      <div className='p-4 flex gap-2'>
        <Link
          href={`/properties/${property._id}/edit`}
          className='flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center transition-all text-white'
        >
          Edit Details
        </Link>
        <button
          onClick={() => onDelete(property._id)}
          className='px-6 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all'
        >
          Remove
        </button>
      </div>
    </div>
  );
};

export default PropertyAssetCard;
