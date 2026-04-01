import Image from 'next/image';
import Link from 'next/link';
import {
  FaBed,
  FaBath,
  FaRulerCombined,
  FaMoneyBill,
  FaMapMarker,
} from 'react-icons/fa';

const PropertyCard = ({ property }) => {
  const getRateDisplay = () => {
    const { rates } = property;

    if (rates.monthly) {
      return `${rates.monthly.toLocaleString()}/mo`;
    } else if (rates.weekly) {
      return `${rates.weekly.toLocaleString()}/wk`;
    } else if (rates.nightly) {
      return `${rates.nightly.toLocaleString()}/night`;
    }
  };

  return (
    <div className='rounded-xl shadow-md relative'>
      <Image
        src={property.images[0]}
        alt=''
        height={0}
        width={0}
        sizes='100vw'
        className='w-full h-auto rounded-t-xl'
      />
      <div className='p-4'>
        <div className='text-left md:text-center lg:text-left mb-6'>
          <div className='text-gray-600'>{property.type}</div>
          <h3 className='text-xl font-bold'>{property.name}</h3>
        </div>
        <h3 
          style={{ color: 'var(--primary-color)' }}
          className='absolute top-[10px] right-[10px] bg-white px-4 py-2 rounded-lg font-bold text-right md:text-center lg:text-right'
        >
          ${getRateDisplay()}
        </h3>

        <div className='flex justify-center gap-4 text-gray-500 mb-4'>
          <p>
            <FaBed className='inline mr-2' /> {property.beds}{' '}
            <span className='md:hidden lg:inline'>Beds</span>
          </p>
          <p>
            <FaBath className='inline mr-2' />
            {property.baths} <span className='md:hidden lg:inline'>Baths</span>
          </p>
          <p>
            <FaRulerCombined className='inline mr-2' />
            {property.square_feet}{' '}
            <span className='md:hidden lg:inline'>sqft</span>
          </p>
        </div>

        <div className='flex justify-center gap-4 text-green-900 text-sm mb-4'>
          {property.rates.nightly && (
            <p>
              <FaMoneyBill className='inline mr-2' /> Nightly
            </p>
          )}

          {property.rates.weekly && (
            <p>
              <FaMoneyBill className='inline mr-2' /> Weekly
            </p>
          )}

          {property.rates.monthly && (
            <p>
              <FaMoneyBill className='inline mr-2' /> Monthly
            </p>
          )}
        </div>

        <div className='border border-gray-100 mb-5'></div>

        <div className='flex flex-col lg:flex-row justify-between mb-4 gap-2'>
          <div className='flex align-middle gap-2 mb-4 lg:mb-0'>
            <FaMapMarker className='text-orange-700 mt-1' />
            <span className='text-orange-700 text-sm'>
              {' '}
              {property.location.city}, {property.location.state}{' '}
            </span>
          </div>
          <div className='flex gap-2'>
            <Link
              href={`/explorer?lat=${property.location_geo?.coordinates[1]}&lng=${property.location_geo?.coordinates[0]}&id=${property._id}`}
              className='bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-center text-xs flex items-center gap-1 transition-all'
            >
              <FaMapMarker /> Map
            </Link>
            <Link
              href={`/properties/${property._id}`}
              style={{ backgroundColor: 'var(--primary-color)' }}
              className='hover:opacity-90 text-white px-4 py-2 rounded-lg text-center text-xs transition-all'
            >
              Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PropertyCard;
