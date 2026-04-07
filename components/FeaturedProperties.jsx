import { getProperties } from '@/lib/core/propertyRecon';
import FeaturedPropertyCard from './FeaturedPropertyCard';

const FeaturedProperties = async () => {
  const properties = await getProperties({
    showFeatured: true,
  });

  return (
    properties.length > 0 && (
      <section className='bg-blue-50 px-4 pt-6 pb-10'>
        <div className='container-xl lg:container m-auto'>
          <h2 className='text-3xl font-bold text-blue-500 mb-6 text-center'>
            Featured Properties
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {properties.map((property) => (
              <FeaturedPropertyCard key={property._id} property={property} />
            ))}
          </div>
        </div>
      </section>
    )
  );
};
export default FeaturedProperties;
