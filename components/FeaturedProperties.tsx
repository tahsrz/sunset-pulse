import React from 'react';
import { getProperties } from '@/lib/core/propertyRecon';
import FeaturedPropertyCard from './FeaturedPropertyCard';
import { Property } from '@/lib/types';
import marketingCopy from '@/config/marketing_copy.json';

const FeaturedProperties: React.FC = async () => {
  const properties: Property[] = await getProperties({
    showFeatured: true,
  });

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
