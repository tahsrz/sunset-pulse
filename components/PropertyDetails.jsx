import { useState } from 'react';
import {
  FaBed,
  FaBath,
  FaRulerCombined,
  FaTimes,
  FaCheck,
  FaMapMarker,
  FaChartLine,
  FaInfoCircle,
  FaVrCardboard,
  FaMicrochip,
} from 'react-icons/fa';
import PropertyMap from '@/components/PropertyMap';
import SunsetPulseViewer from '@/components/SunsetPulseViewer';
import PropertyFiberViewer from '@/components/PropertyFiberViewer';

/**
 * Detailed information about property
 * @param {Object} props - Component properties
 * @param {Object} props.property - The property object
 * @param {Object} props.rentData - RentCast data 
 */
const PropertyDetails = ({ property, rentData }) => {
  const [viewerType, setViewerType] = useState('fiber'); // Default to elite R3F
  return (
    <main>
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

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
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

      {/* Market Intel / RentCast Section */}
      {rentData && (
        <div className='bg-slate-900 border border-blue-500/20 p-8 rounded-2xl shadow-2xl mt-8 relative overflow-hidden group transition-all duration-500 hover:border-blue-500/40'>
          <div className='absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity'>
            <FaChartLine size={80} className='text-blue-400' />
          </div>
          
          <h3 className='text-xl font-black text-white mb-8 uppercase tracking-[0.2em] italic border-l-4 border-blue-500 pl-4 flex items-center gap-3'>
            Market Intelligence <span className='text-[8px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded not-italic tracking-widest'>RENTCAST_API</span>
          </h3>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10'>
            <div className='bg-slate-950/80 border border-white/5 p-6 rounded-2xl'>
              <div className='text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2'>
                Est. Market Rent <FaInfoCircle className='text-[8px]' />
              </div>
              <div className='text-2xl font-black text-white italic'>
                ${rentData.rent?.toLocaleString()} <span className='text-[10px] text-slate-500 not-italic'>/mo</span>
              </div>
            </div>

            <div className='bg-slate-950/80 border border-white/5 p-6 rounded-2xl'>
              <div className='text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2'>Confidence Score</div>
              <div className='flex items-end gap-2'>
                <div className='text-2xl font-black text-green-400 italic'>{(rentData.confidenceScore * 100).toFixed(0)}%</div>
                <div className='h-2 w-full bg-slate-800 rounded-full mb-2 overflow-hidden'>
                  <div 
                    className='h-full bg-green-500 transition-all duration-1000' 
                    style={{ width: `${rentData.confidenceScore * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className='bg-slate-950/80 border border-white/5 p-6 rounded-2xl'>
              <div className='text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2'>Rent Range</div>
              <div className='text-sm font-bold text-slate-400'>
                ${rentData.rentRangeLow?.toLocaleString()} — ${rentData.rentRangeHigh?.toLocaleString()}
              </div>
            </div>
          </div>

          <p className='text-[9px] text-slate-500 mt-6 uppercase tracking-widest italic'>
            * Intelligence data fetched in real-time. Jamie is using this to calculate potential ROI.
          </p>
        </div>
      )}

      <div className='bg-slate-900 border border-white/10 p-8 rounded-2xl shadow-2xl mt-8 transition-all duration-500 hover:border-blue-500/30'>
        <h3 className='text-xl font-black text-white mb-8 uppercase tracking-[0.2em] italic border-l-4 border-blue-500 pl-4'>Description & Details</h3>
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
        <p className='text-slate-400 leading-relaxed font-medium'>{property.description}</p>
      </div>

      <div className='bg-slate-950 p-2 rounded-[2rem] mt-8 shadow-2xl border border-white/5'>
        <div className='flex items-center justify-between px-8 py-6'>
          <div className='flex flex-col gap-1'>
            <h3 className='text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic'>
              3D Intelligence Grid // {viewerType === 'fiber' ? 'Elite Recon' : 'Neural Feed'}
            </h3>
            <div className='text-[8px] text-blue-500/50 font-mono'>
              {viewerType === 'fiber' ? 'R3F_SATELLITE_INTERPOLATION_ON' : 'CUSTOM_RASTERIZER_V2.0'}
            </div>
          </div>

          <div className='flex gap-2 bg-black/40 p-1.5 rounded-full border border-white/5'>
            <button 
              onClick={() => setViewerType('legacy')}
              className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewerType === 'legacy' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <FaMicrochip size={10} /> Neural
            </button>
            <button 
              onClick={() => setViewerType('fiber')}
              className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewerType === 'fiber' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <FaVrCardboard size={12} /> Elite
            </button>
          </div>
        </div>

        <div className='relative min-h-[500px]'>
          {viewerType === 'fiber' ? (
            <PropertyFiberViewer property={property} />
          ) : (
            <SunsetPulseViewer objUrl={property.objUrl} property={property} />
          )}
        </div>
      </div>

      <div className='bg-slate-900 border border-white/10 p-8 rounded-2xl shadow-2xl mt-8 transition-all duration-500 hover:border-blue-500/30'>
        <h3 className='text-xl font-black text-white mb-8 uppercase tracking-[0.2em] italic border-l-4 border-blue-500 pl-4'>Amenities</h3>

        <ul className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4'>
          {property.amenities.map((amenity, index) => (
            <li key={index} className='flex items-center gap-3 text-slate-300 group/item'>
              <FaCheck className='text-blue-500 transition-transform group-hover/item:scale-125' /> 
              <span className='text-sm font-medium tracking-tight'>{amenity}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className='bg-white p-6 rounded-lg shadow-md mt-6'>
        <PropertyMap property={property} />
      </div>
    </main>
  );
};
export default PropertyDetails;
