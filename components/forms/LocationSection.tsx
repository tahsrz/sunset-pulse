import React from 'react';

interface LocationSectionProps {
  location: {
    street: string;
    city: string;
    state: string;
    zipcode: string;
  };
  onChange: (e: React.ChangeEvent<any>) => void;
}

const LocationSection: React.FC<LocationSectionProps> = ({ location, onChange }) => {
  return (
    <div className='mb-4 bg-blue-50 p-4 rounded-lg'>
      <label className='block text-gray-700 font-bold mb-2'>Location</label>
      <input
        type='text'
        id='street'
        name='location.street'
        className='border rounded w-full py-2 px-3 mb-2'
        placeholder='Street'
        value={location.street}
        onChange={onChange}
      />
      <input
        type='text'
        id='city'
        name='location.city'
        className='border rounded w-full py-2 px-3 mb-2'
        placeholder='City'
        required
        value={location.city}
        onChange={onChange}
      />
      <input
        type='text'
        id='state'
        name='location.state'
        className='border rounded w-full py-2 px-3 mb-2'
        placeholder='State'
        required
        value={location.state}
        onChange={onChange}
      />
      <input
        type='text'
        id='zipcode'
        name='location.zipcode'
        className='border rounded w-full py-2 px-3 mb-2'
        placeholder='Zipcode'
        value={location.zipcode}
        onChange={onChange}
      />
    </div>
  );
};

export default LocationSection;
