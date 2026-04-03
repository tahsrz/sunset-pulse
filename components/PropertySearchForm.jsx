'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { memoryBridge } from '@/lib/memory_bridge';

const PropertySearchForm = () => {
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState('All');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rvType, setRvType] = useState('All');
  const [minLength, setMinLength] = useState('');

  const router = useRouter();

  // Load preferences on mount for predictive search
  useEffect(() => {
    const prefs = memoryBridge.getPreferences();
    if (prefs.location && !location) setLocation(prefs.location);
    if (prefs.style && propertyType === 'All') setPropertyType(prefs.style);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    let query = `?location=${location}&propertyType=${propertyType}`;
    
    if (propertyType === 'RV' || propertyType === 'RV Park') {
      if (rvType !== 'All') query += `&rvType=${rvType}`;
      if (minLength) query += `&minLength=${minLength}`;
    }

    if (location === '' && propertyType === 'All') {
      router.push('/properties');
    } else {
      // Memory Layer 1: Log Interaction
      memoryBridge.logInteraction(`Search: ${location} | ${propertyType}`);

      // Memory Layer 2 & 3: Save to Dynamic/Session
      memoryBridge.save('session', 'location', location);
      memoryBridge.save('dynamic', 'style', propertyType);
      
      // Memory Layer Wrap: (For future Sanity/Data Pipeline logging)
      const telemetry = memoryBridge.wrapQuery(query, 'Property Search RECON');
      if (process.env.NODE_ENV === 'development') {
        console.log('[MEMORY_BRIDGE_TELEMETRY]', telemetry);
      }

      router.push(`/properties/search-results${query}`);
    }
  };

  const isRV = propertyType === 'RV' || propertyType === 'RV Park';

  return (
    <div className='w-full max-w-2xl mx-auto'>
      <form
        onSubmit={handleSubmit}
        className='mt-3 flex flex-col md:flex-row items-center gap-2'
      >
        <div className='w-full md:w-3/5'>
          <label htmlFor='location' className='sr-only'>
            Location
          </label>
          <input
            type='text'
            id='location'
            placeholder='Enter Keywords or Location'
            className='w-full px-4 py-3 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring focus:ring-blue-500'
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div className='w-full md:w-2/5'>
          <label htmlFor='property-type' className='sr-only'>
            Property Type
          </label>
          <select
            id='property-type'
            className='w-full px-4 py-3 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring focus:ring-blue-500'
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
          >
            <option value='All'>All</option>
            <option value='Apartment'>Apartment</option>
            <option value='House'>House</option>
            <option value='RV'>RV (Rental Vehicle)</option>
            <option value='RV Park'>RV Park (Spot)</option>
            <option value='Cabin Or Cottage'>Cabin or Cottage</option>
            <option value='Room'>Room</option>
            <option value='Other'>Other</option>
          </select>
        </div>
        <button
          type='submit'
          className='w-full md:w-auto px-6 py-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-500 transition-all font-bold'
        >
          Search
        </button>
      </form>
      
      {isRV && (
        <div className='mt-2 flex flex-col gap-2 bg-slate-100/50 p-4 rounded-lg border border-slate-200 animate-in fade-in duration-500'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-black uppercase tracking-widest text-slate-500 italic'>RV Advanced Recon</span>
            <button 
              type='button'
              onClick={() => setShowAdvanced(!showAdvanced)}
              className='text-[10px] text-blue-600 font-bold uppercase hover:underline'
            >
              {showAdvanced ? 'Collapse' : 'Expand Filters'}
            </button>
          </div>
          
          {showAdvanced && (
            <div className='grid grid-cols-2 gap-4 mt-2'>
              <div>
                <label className='block text-[10px] font-bold text-slate-600 mb-1 uppercase'>RV Class/Type</label>
                <select 
                  className='w-full text-xs p-2 rounded bg-white border border-slate-300'
                  value={rvType}
                  onChange={(e) => setRvType(e.target.value)}
                >
                  <option value='All'>Any Type</option>
                  <option value='Class A'>Class A</option>
                  <option value='Class B'>Class B</option>
                  <option value='Class C'>Class C</option>
                  <option value='Travel Trailer'>Travel Trailer</option>
                  <option value='Fifth Wheel'>Fifth Wheel</option>
                </select>
              </div>
              <div>
                <label className='block text-[10px] font-bold text-slate-600 mb-1 uppercase'>Min Length (ft)</label>
                <input 
                  type='number' 
                  placeholder='eg. 30'
                  className='w-full text-xs p-2 rounded bg-white border border-slate-300'
                  value={minLength}
                  onChange={(e) => setMinLength(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default PropertySearchForm;
