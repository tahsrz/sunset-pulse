import Link from 'next/link';
import PropertyCard from '@/components/PropertyCard';
import { fetchProperties } from '@/lib/core/requests';

const HousingSections = async () => {
  const data = await fetchProperties();
  const properties = data?.properties || [];

  // Filter properties by type for distinct sections
  const rvParks = properties.filter((p) => 
    p.type?.toLowerCase().includes('rv') || 
    p.amenities?.some(a => a.toLowerCase().includes('rv'))
  ).slice(0, 3);

  const apartments = properties.filter((p) => 
    p.type?.toLowerCase() === 'apartment' || 
    p.type?.toLowerCase() === 'condo'
  ).slice(0, 3);

  const houses = properties.filter((p) => 
    p.type?.toLowerCase() === 'house'
  ).slice(0, 3);

  const ruralLand = properties.filter((p) => 
    p.type?.toLowerCase() === 'other' || 
    p.description?.toLowerCase().includes('acreage')
  ).slice(0, 3);

  const shortTerm = properties.filter((p) => 
    p.amenities?.some(a => a.toLowerCase().includes('weekly')) ||
    p.rates?.nightly || p.rates?.weekly
  ).slice(0, 3);

  const industrial = properties.filter((p) => 
    p.type?.toLowerCase() === 'industrial' || 
    p.description?.toLowerCase().includes('warehouse') ||
    p.description?.toLowerCase().includes('shop')
  ).slice(0, 3);

  const offices = properties.filter((p) => 
    p.type?.toLowerCase() === 'office' || 
    p.description?.toLowerCase().includes('executive suite') ||
    p.description?.toLowerCase().includes('professional office')
  ).slice(0, 3);

  const seniorLiving = properties.filter((p) => 
    p.type?.toLowerCase() === 'senior living' || 
    p.description?.toLowerCase().includes('assisted living') ||
    p.description?.toLowerCase().includes('senior community')
  ).slice(0, 3);

  const mobileHomes = properties.filter((p) => 
    p.type?.toLowerCase().includes('mobile') || 
    p.type?.toLowerCase().includes('manufactured')
  ).slice(0, 3);

  const renderSection = (title, items, typeSlug) => (
    <section className='px-4 py-12 border-b border-gray-100 last:border-0'>
      <div className='container-xl lg:container m-auto'>
        <div className='flex justify-between items-end mb-8'>
          <div>
            <h2 className='text-3xl font-black text-slate-900 uppercase tracking-tighter'>
              {title}
            </h2>
            <div className='h-1 w-20 bg-blue-600 mt-2'></div>
          </div>
          <Link 
            href={`/properties?type=${typeSlug}`}
            className='text-blue-600 font-bold hover:text-blue-800 transition-colors text-sm uppercase tracking-widest'
          >
            Browse All &rarr;
          </Link>
        </div>
        
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {items.length === 0 ? (
            <div className='col-span-3 p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center'>
              <p className='text-gray-500 font-medium'>No {title} available in your area yet.</p>
            </div>
          ) : (
            items.map((property) => (
              <PropertyCard key={property._id} property={property} />
            ))
          )}
        </div>
      </div>
    </section>
  );

  return (
    <div className='bg-white'>
      {renderSection('RV Parks & Resorts', rvParks, 'rv')}
      {renderSection('Short-Term & Vacation', shortTerm, 'short-term')}
      {renderSection('Modern Apartments', apartments, 'apartment')}
      {renderSection('Texas Residential', houses, 'house')}
      {renderSection('Mobile Home Communities', mobileHomes, 'mobile-home')}
      {renderSection('Senior Living & Care', seniorLiving, 'senior-living')}
      {renderSection('Executive Office Space', offices, 'office')}
      {renderSection('Industrial & Commercial', industrial, 'industrial')}
      {renderSection('Rural Land & Acreage', ruralLand, 'land')}
    </div>
  );
};

export default HousingSections;
