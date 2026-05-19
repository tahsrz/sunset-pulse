import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FaBed,
  FaBath,
  FaRulerCombined,
  FaMoneyBill,
  FaMapMarker,
} from 'react-icons/fa';
import { Property } from '@/lib/types';

interface FeaturedPropertyCardProps {
  property: Property;
}

const FeaturedPropertyCard: React.FC<FeaturedPropertyCardProps> = ({ property }) => {
  const normalizeImg = (src: string) => {
    if (!src) return '/images/property-placeholder.jpg';
    if (src.startsWith('http') || src.startsWith('/')) return src;
    return `/${src}`;
  };

  const getRateDisplay = () => {
    const { rates } = property;

    if (rates.monthly) {
      return `${rates.monthly.toLocaleString()}/mo`;
    } else if (rates.weekly) {
      return `${rates.weekly.toLocaleString()}/wk`;
    } else if (rates.nightly) {
      return `${rates.nightly.toLocaleString()}/night`;
    }
    return '0/night';
  };

  return (
    <div className='waterlily-card rounded-2xl relative flex flex-col md:flex-row overflow-hidden'>
      <Image
        src={normalizeImg(property.images[0])}
        alt=''
        width={0}
        height={0}
        sizes='100vw'
        className='object-cover w-full md:w-2/5 min-h-[240px]'
      />
      <div className='p-6'>
        <h3 className='text-xl font-bold text-white'>{property.name}</h3>
        <div className='text-teal-100/70 mb-4'>{property.type}</div>
        <h3 className='absolute top-[10px] left-[10px] bg-[#102a3a]/85 backdrop-blur-md border border-amber-200/25 px-4 py-2 rounded-lg text-amber-100 font-bold text-right md:text-center lg:text-right shadow-md'>
          ${getRateDisplay()}
        </h3>
        <div className='flex justify-center gap-4 text-teal-100/75 mb-4'>
          <div className='flex items-center'>
            <FaBed className='inline-block mr-2' /> {property.beds}{' '}
            <span className='md:hidden lg:inline'>Beds</span>
          </div>
          <div className='flex items-center'>
            <FaBath className='inline-block mr-2' /> {property.baths}{' '}
            <span className='md:hidden lg:inline'>Baths</span>
          </div>
          <div className='flex items-center'>
            <FaRulerCombined className='inline-block mr-2' />
            {property.square_feet}{' '}
            <span className='md:hidden lg:inline'>sqft</span>
          </div>
        </div>

        <div className='flex justify-center gap-4 text-teal-200 text-sm mb-4'>
          {property.rates.nightly && (
            <div className='flex items-center'>
              <FaMoneyBill className='inline mr-2' /> Nightly
            </div>
          )}

          {property.rates.weekly && (
            <div className='flex items-center'>
              <FaMoneyBill className='inline mr-2' /> Weekly
            </div>
          )}

          {property.rates.monthly && (
            <div className='flex items-center'>
              <FaMoneyBill className='inline mr-2' /> Monthly
            </div>
          )}
        </div>

        <div className='border border-teal-200/15 mb-5'></div>

        <div className='flex flex-col lg:flex-row justify-between'>
          <div className='flex align-middle gap-2 mb-4 lg:mb-0'>
            <FaMapMarker className='text-lg text-rose-200' />
            <span className='text-rose-100'>
              {' '}
              {property.location.city} {property.location.state}
            </span>
          </div>
          <Link
            href={`/properties/${property._id}`}
            className='h-[36px] waterlily-button text-white px-4 py-2 rounded-lg text-center text-sm flex items-center'
          >
            Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FeaturedPropertyCard;
