'use client';

import React from 'react';
import { FaMapMarkedAlt, FaGlobeAmericas, FaListAlt } from 'react-icons/fa';

const EngineSection = () => {
  return (
    <section className='col-span-1 xl:col-span-2 space-y-6'>
      <div className='flex items-center gap-4 text-amber-200'>
        <FaMapMarkedAlt size={28} aria-hidden='true' />
        <h2 className='text-2xl font-semibold tracking-tight'>Places and Listings</h2>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
        <div className='waterlily-card p-6 rounded-2xl'>
          <h4 className='font-semibold mb-3 flex items-center gap-2'><FaGlobeAmericas className='text-amber-200' size={14}/> Explore the Map</h4>
          <p className='text-sm text-teal-50/70 leading-relaxed'>
            The map gives you a sense of where places sit and what is nearby. Open a listing when you need its full details.
          </p>
        </div>
        <div className='waterlily-card p-6 rounded-2xl'>
          <h4 className='font-semibold mb-3 flex items-center gap-2'><FaMapMarkedAlt className='text-rose-200' size={14}/> Look around the Area</h4>
          <p className='text-sm text-teal-50/70 leading-relaxed'>
            The virtual map brings neighborhood context and available property signals into one view. It is a way to explore, not a replacement for checking the listing itself.
          </p>
        </div>
        <div className='waterlily-card p-6 rounded-2xl'>
          <h4 className='font-semibold mb-3 flex items-center gap-2'><FaListAlt className='text-teal-200' size={14}/> Compare the Available Homes</h4>
          <p className='text-sm text-teal-50/70 leading-relaxed'>
            Switch between curated properties and the current MLS feed. Photos and details depend on what the listing provider has supplied.
          </p>
        </div>
      </div>
    </section>
  );
};

export default EngineSection;
