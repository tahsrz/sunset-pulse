import React from 'react';
import { AMENITIES } from '@/constants/amenities';

interface AmenitiesSectionProps {
  selectedAmenities: string[];
  onChange: (e: React.ChangeEvent<any>) => void;
}

const AmenitiesSection: React.FC<AmenitiesSectionProps> = ({ selectedAmenities, onChange }) => {
  return (
    <div className='mb-4'>
      <label className='block text-gray-700 font-bold mb-2'>
        Amenities
      </label>
      <div className='grid grid-cols-2 md:grid-cols-3 gap-2'>
        {AMENITIES.map((amenity) => (
          <div key={amenity}>
            <input
              type='checkbox'
              id={`amenity_${amenity.toLowerCase().replace(/ /g, '_').replace(/\//g, '_').replace(/&/g, 'n')}`}
              name='amenities'
              value={amenity}
              className='mr-2'
              checked={selectedAmenities.includes(amenity)}
              onChange={onChange}
            />
            <label htmlFor={`amenity_${amenity.toLowerCase().replace(/ /g, '_').replace(/\//g, '_').replace(/&/g, 'n')}`}>{amenity}</label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AmenitiesSection;
