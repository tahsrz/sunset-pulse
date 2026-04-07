import React from 'react';
import {
  FaBed,
  FaBath,
  FaRulerCombined,
  FaBus,
  FaTrailer,
  FaPlug,
  FaWater,
  FaBiohazard,
} from 'react-icons/fa';

interface PropertySpecsProps {
  property: any;
}

const PropertySpecs: React.FC<PropertySpecsProps> = ({ property }) => {
  const isRV = property.type === 'RV' || property.type === 'RV Park';

  return (
    <div className='bg-slate-900 border border-white/10 p-8 rounded-2xl shadow-2xl mt-8 transition-all duration-500 hover:border-blue-500/30'>
      <h3 className='text-xl font-black text-white mb-8 uppercase tracking-[0.2em] italic border-l-4 border-blue-500 pl-4'>Description & Details</h3>
      
      {isRV ? (
        <div className='flex flex-wrap justify-center md:justify-start gap-12 text-blue-400 mb-8'>
          <div className='flex items-center gap-3'>
            {property.rv_type?.includes('Class') ? <FaBus className='text-2xl' /> : <FaTrailer className='text-2xl' />}
            <span className='text-lg font-black italic'>{property.rv_type || 'RV'} <span className='text-[10px] uppercase tracking-widest text-slate-500 not-italic ml-1'>Type</span></span>
          </div>
          <div className='flex items-center gap-3'>
            <FaRulerCombined className='text-2xl' /> 
            <span className='text-lg font-black italic'>{property.rv_length || 'N/A'} <span className='text-[10px] uppercase tracking-widest text-slate-500 not-italic ml-1'>Length (ft)</span></span>
          </div>
          <div className='flex items-center gap-3' title='Electric Hookup'>
            <FaPlug className={`text-2xl ${property.hookups?.electric !== 'None' ? 'text-yellow-500' : 'text-slate-600'}`} />
            <span className='text-lg font-black italic'>{property.hookups?.electric || 'None'} <span className='text-[10px] uppercase tracking-widest text-slate-500 not-italic ml-1'>Electric</span></span>
          </div>
          <div className='flex items-center gap-3' title='Water Hookup'>
            <FaWater className={`text-2xl ${property.hookups?.water ? 'text-blue-500' : 'text-slate-600'}`} />
            <span className='text-[10px] uppercase tracking-widest text-slate-500 not-italic'>Water</span>
          </div>
          <div className='flex items-center gap-3' title='Sewer Hookup'>
            <FaBiohazard className={`text-2xl ${property.hookups?.sewer ? 'text-green-600' : 'text-slate-600'}`} />
            <span className='text-[10px] uppercase tracking-widest text-slate-500 not-italic'>Sewer</span>
          </div>
        </div>
      ) : (
        <div className='flex justify-center md:justify-start gap-12 text-blue-400 mb-8'>
          <div className='flex items-center gap-3'>
            <FaBed className='text-2xl' /> 
            <span className='text-lg font-black italic'>{property.beds} <span className='text-[10px] uppercase tracking-widest text-slate-500 not-italic ml-1'>Beds</span></span>
          </div>
          <div className='flex items-center gap-3'>
            <FaBath className='text-2xl' /> 
            <span className='text-lg font-black italic'>{property.baths} <span className='text-[10px] uppercase tracking-widest text-slate-500 not-italic ml-1'>Baths</span></span>
          </div>
          <div className='flex items-center gap-3'>
            <FaRulerCombined className='text-2xl' />
            <span className='text-lg font-black italic'>{property.square_feet} <span className='text-[10px] uppercase tracking-widest text-slate-500 not-italic ml-1'>sqft</span></span>
          </div>
        </div>
      )}
      
      <p className='text-slate-400 leading-relaxed font-medium'>{property.description}</p>
    </div>
  );
};

export default PropertySpecs;
