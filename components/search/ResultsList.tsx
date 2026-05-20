'use client';

import React from 'react';
import PropertyCard from '@/components/PropertyCard';
import Spinner from '@/components/Spinner';

interface ResultsListProps {
  properties: any[];
  loading: boolean;
  locationLabel: string;
  propertyTypeLabel: string;
  isPolygonActive: boolean;
  hoveredPropertyId: string | null;
  setHoveredPropertyId: (id: string | null) => void;
  handleRouteClick: (property: any) => void;
}

const ResultsList: React.FC<ResultsListProps> = ({
  properties, loading, locationLabel, propertyTypeLabel,
  isPolygonActive, hoveredPropertyId, setHoveredPropertyId, handleRouteClick
}) => {
  return (
    <div className='w-full md:w-3/5 h-full overflow-y-auto bg-slate-950 p-6 custom-scrollbar'>
      <div className='container-xl lg:container m-auto'>
        <div className='mb-8'>
          <h1 className='text-3xl font-black text-white uppercase tracking-tighter'>Search Results</h1>
          <div className='flex flex-col gap-1 mt-1'>
            <p className='text-slate-400 font-medium text-xs'>
              Found {properties.length} properties in <span className="text-blue-400 font-bold">{locationLabel}</span> [{propertyTypeLabel}]
            </p>
            {isPolygonActive && (
              <span className='w-fit text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-bold uppercase'>Geo-Filtered Custom Boundary</span>
            )}
          </div>
        </div>

        {/* Jamie Summary */}
        <div className='mb-8 p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center gap-4 group hover:bg-blue-600/20 transition-all'>
           <div className='w-1 h-12 bg-blue-500 rounded-full group-hover:scale-y-110 transition-transform' />
           <div>
             <h3 className='text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1'>Jamie Search Summary</h3>
             <p className='text-[11px] text-slate-300 font-medium leading-relaxed italic'>
               "Your filters are applied. Results are refreshed with available MLS and local listing data."
             </p>
           </div>
        </div>

        {loading ? (
          <div className='py-20'><Spinner loading={loading} /></div>
        ) : properties.length === 0 ? (
          <div className='bg-slate-900 p-12 rounded-3xl border border-white/10 text-center shadow-sm'>
            <p className='text-slate-400 font-bold text-sm uppercase tracking-widest'>No properties matched your criteria. Adjust your search filters.</p>
          </div>
        ) : (
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20'>
            {properties.map((property) => (
              <div 
                key={property._id || property.mls_id}
                id={`property-${property._id}`}
                onMouseEnter={() => setHoveredPropertyId(property._id)}
                onMouseLeave={() => setHoveredPropertyId(null)}
                className={`transition-all duration-500 rounded-xl ${hoveredPropertyId === property._id ? 'scale-[1.02] ring-4 ring-blue-500/20 z-10' : ''}`}
              >
                <PropertyCard 
                  property={property} 
                  onRouteClick={handleRouteClick}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsList;
