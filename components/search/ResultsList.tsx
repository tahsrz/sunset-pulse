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
    <div className='w-full md:w-3/5 h-full overflow-y-auto bg-slate-50 p-6 custom-scrollbar'>
      <div className='container-xl lg:container m-auto'>
        <div className='mb-8'>
          <h1 className='text-3xl font-black text-slate-900 uppercase tracking-tighter'>Search Results</h1>
          <div className='flex flex-col gap-1 mt-1'>
            <p className='text-slate-500 font-medium text-xs'>
              Found {properties.length} properties in <span className="text-blue-600 font-bold">{locationLabel}</span> [{propertyTypeLabel}]
            </p>
            {isPolygonActive && (
              <span className='w-fit text-[8px] bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded font-bold uppercase'>Geo-Filtered Custom Boundary</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className='py-20'><Spinner loading={loading} /></div>
        ) : properties.length === 0 ? (
          <div className='bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-sm'>
            <p className='text-slate-500 font-bold text-sm uppercase tracking-widest'>No properties matched your criteria. Adjust your search filters.</p>
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
