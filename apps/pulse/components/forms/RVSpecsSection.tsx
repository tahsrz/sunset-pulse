import React from 'react';

interface RVSpecsSectionProps {
  rv_type: string;
  rv_length: string;
  hookups: {
    water: boolean;
    sewer: boolean;
    electric: string;
  };
  onChange: (e: React.ChangeEvent<any>) => void;
}

const RVSpecsSection: React.FC<RVSpecsSectionProps> = ({ rv_type, rv_length, hookups, onChange }) => {
  return (
    <div className='mb-4 bg-orange-50 p-4 rounded-lg border border-orange-200'>
      <label className='block text-orange-800 font-bold mb-2 uppercase tracking-widest text-xs'>RV Specifications</label>
      <div className='flex flex-wrap -mx-2'>
        <div className='w-full sm:w-1/2 px-2 mb-4'>
          <label htmlFor='rv_type' className='block text-gray-700 font-bold mb-2 text-sm'>
            RV Type
          </label>
          <select
            id='rv_type'
            name='rv_type'
            className='border rounded w-full py-2 px-3'
            value={rv_type}
            onChange={onChange}
          >
            <option value=''>Select RV Type</option>
            <option value='Class A'>Class A (Bus Style)</option>
            <option value='Class B'>Class B (Camper Van)</option>
            <option value='Class C'>Class C (Cab-over)</option>
            <option value='Travel Trailer'>Travel Trailer</option>
            <option value='Fifth Wheel'>Fifth Wheel</option>
            <option value='Toy Hauler'>Toy Hauler</option>
            <option value='Other'>Other</option>
          </select>
        </div>
        <div className='w-full sm:w-1/2 px-2 mb-4'>
          <label htmlFor='rv_length' className='block text-gray-700 font-bold mb-2 text-sm'>
            Max Length (ft)
          </label>
          <input
            type='number'
            id='rv_length'
            name='rv_length'
            className='border rounded w-full py-2 px-3'
            placeholder='eg. 35'
            value={rv_length}
            onChange={onChange}
          />
        </div>
      </div>
      
      <label className='block text-gray-700 font-bold mb-2 text-sm'>Hookups Available</label>
      <div className='grid grid-cols-2 md:grid-cols-3 gap-2 mb-4'>
        <div className='flex items-center'>
          <input
            type='checkbox'
            id='hookup_water'
            name='hookups.water'
            className='mr-2'
            checked={hookups.water}
            onChange={onChange}
          />
          <label htmlFor='hookup_water' className='text-sm'>Water</label>
        </div>
        <div className='flex items-center'>
          <input
            type='checkbox'
            id='hookup_sewer'
            name='hookups.sewer'
            className='mr-2'
            checked={hookups.sewer}
            onChange={onChange}
          />
          <label htmlFor='hookup_sewer' className='text-sm'>Sewer</label>
        </div>
        <div className='w-full'>
          <select
            id='hookup_electric'
            name='hookups.electric'
            className='border rounded w-full py-1 px-2 text-sm'
            value={hookups.electric}
            onChange={onChange}
          >
            <option value='None'>No Electric</option>
            <option value='30-Amp'>30-Amp</option>
            <option value='50-Amp'>50-Amp</option>
            <option value='Both'>30 & 50 Amp</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default RVSpecsSection;
