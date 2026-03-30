import Link from 'next/link';
import PropertyCard from '@/components/PropertyCard';
import { fetchProperties } from '@/utils/requests';

const HomeProperties = async () => {
  const data = await fetchProperties();

  // 1. Safety Check: If data or data.properties is missing, default to an empty array
  const properties = data?.properties || [];

  // 2. Sort safely on the defined array
  const recentProperties = properties
    .sort(() => Math.random() - 0.5) // Math.random() - 0.5 is the standard way to shuffle
    .slice(0, 3);

  return (
    <>
      <section className='px-4 py-6'>
        <div className='container-xl lg:container m-auto'>
          <h2 className='text-3xl font-bold text-blue-500 mb-6 text-center'>
            Recent Properties
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {recentProperties.length === 0 ? (
              <p className='text-center col-span-3'>No Properties Found</p>
            ) : (
              recentProperties.map((property) => (
                <PropertyCard key={property._id} property={property} />
              ))
            )}
          </div>
        </div>
      </section>
      {/* ... rest of your component */}
    </>
  );
};
export default HomeProperties;