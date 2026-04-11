import React from 'react';
import { getProperties } from '@/lib/core/propertyRecon';
import FeaturedPropertyCard from './FeaturedPropertyCard';
import { Property } from '@/lib/types';

const FeaturedProperties: React.FC = async () => {
  const properties: Property[] = await getProperties({
    showFeatured: true,
  });

  if (properties.length === 0) return null;

  return (
    <section className='bg-slate-950 px-4 pt-16 pb-10'>
      <div className='container-xl lg:container m-auto'>
        <h2 className='text-3xl font-black text-blue-500 mb-10 text-center italic uppercase tracking-tighter'>
          Featured Assets
        </h2>
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
