import React from 'react';
import { FaCheck } from 'react-icons/fa';

interface AmenityListProps {
  amenities: string[];
}

const AmenityList: React.FC<AmenityListProps> = ({ amenities }) => {
  return (
    <div className='bg-slate-900 border border-white/10 p-8 rounded-2xl shadow-2xl mt-8 transition-all duration-500 hover:border-blue-500/30'>
      <h3 className='text-xl font-black text-white mb-8 uppercase tracking-[0.2em] italic border-l-4 border-blue-500 pl-4'>Amenities</h3>

      <ul className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4'>
        {amenities.map((amenity, index) => (
          <li key={index} className='flex items-center gap-3 text-slate-300 group/item'>
            <FaCheck className='text-blue-500 transition-transform group-hover/item:scale-125' /> 
            <span className='text-sm font-medium tracking-tight'>{amenity}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AmenityList;
