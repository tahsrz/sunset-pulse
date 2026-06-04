import React from 'react';
import { FaMapMarker, FaTimes } from 'react-icons/fa';

interface PropertyHeaderProps {
  property: any;
}

const PropertyHeader: React.FC<PropertyHeaderProps> = ({ property }) => {
  const primaryPrice = (property.list_price && property.list_price > 0) ? property.list_price : property.price;

  return (
    <div className='bg-slate-900 border border-white/10 p-8 rounded-2xl shadow-2xl text-center md:text-left overflow-hidden relative group transition-all duration-500 hover:border-blue-500/30'>
      <div className='absolute -top-24 -left-24 w-48 h-48 bg-blue-600/5 blur-[100px] rounded-full' />
      <div className='text-blue-400/70 text-[10px] font-black uppercase tracking-[0.3em] mb-4 italic'>{property.type}</div>
      <h1 className='text-4xl font-black mb-6 text-white tracking-tighter italic uppercase'>{property.name}</h1>
      <div className='text-slate-400 mb-8 flex align-middle justify-center md:justify-start items-center gap-2'>
        <FaMapMarker className='text-lg text-blue-500' />
        <p className='font-medium tracking-tight'>
          {property.location.street}, {property.location.city}{' '}
          {property.location.state}
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
        {primaryPrice > 0 && (
          <div className='bg-slate-950/50 border border-blue-500/20 p-6 rounded-2xl transition-all hover:bg-slate-900'>
            <div className='text-blue-400 text-[10px] font-black uppercase tracking-widest mb-2'>Sale Price</div>
            <div className='text-3xl font-black text-white italic'>
              ${primaryPrice.toLocaleString()}
            </div>
          </div>
        )}
        <div className='bg-slate-950/50 border border-white/5 p-6 rounded-2xl transition-all hover:bg-slate-900'>
          <div className='text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2'>Nightly</div>
          <div className='text-3xl font-black text-blue-400 italic'>
            {property.rates.nightly ? (
              `$${property.rates.nightly.toLocaleString()}`
            ) : (
              <FaTimes className='text-red-900/50 mx-auto md:mx-0' />
            )}
          </div>
        </div>
        <div className='bg-slate-950/50 border border-white/5 p-6 rounded-2xl transition-all hover:bg-slate-900'>
          <div className='text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2'>Weekly</div>
          <div className='text-3xl font-black text-blue-400 italic'>
            {property.rates.weekly ? (
              `$${property.rates.weekly.toLocaleString()}`
            ) : (
              <FaTimes className='text-red-900/50 mx-auto md:mx-0' />
            )}
          </div>
        </div>
        <div className='bg-slate-950/50 border border-white/5 p-6 rounded-2xl transition-all hover:bg-slate-900'>
          <div className='text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2'>Monthly</div>
          <div className='text-3xl font-black text-blue-400 italic'>
            {property.rates.monthly ? (
              `$${property.rates.monthly.toLocaleString()}`
            ) : (
              <FaTimes className='text-red-900/50 mx-auto md:mx-0' />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyHeader;
