import React from 'react';
import Link from 'next/link';
import FeaturedPropertyCard from './FeaturedPropertyCard';
import { Property } from '@/lib/types';
import marketingCopy from '@/config/marketing_copy.json';
import { getTourHotList } from '@/lib/data/tourHotList';

const FeaturedProperties: React.FC = async () => {
  const properties = (await getTourHotList({ limit: 10 })).listings as Property[];

  if (properties.length === 0) return null;

  const { featured } = marketingCopy.section_headers;

  return (
    <section className='waterlily-section px-4 pt-16 pb-10'>
      <div className='container-xl lg:container m-auto'>
        <div className="mb-10 text-center">
          <h2 className='text-3xl font-black waterlily-heading italic uppercase tracking-tighter'>
            {featured.title}
          </h2>
          <p className="text-teal-100/55 text-[10px] font-mono uppercase tracking-[0.4em] mt-2">{featured.tagline}</p>
          <Link
            href="/tour-studio"
            className="mt-5 inline-flex rounded-full border border-teal-200/20 px-5 py-2 text-[9px] font-black uppercase tracking-[0.28em] text-teal-100 transition hover:border-teal-200/50 hover:bg-teal-200/10"
          >
            Open Tour Studio
          </Link>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {properties.map((property) => (
            <FeaturedPropertyCard key={property._id} property={property} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProperties;
