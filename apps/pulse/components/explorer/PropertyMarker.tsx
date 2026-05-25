'use client';

import React, { memo } from 'react';
import { Marker } from 'react-map-gl';
import { FaHouse, FaCaravan, FaBus, FaTrailer } from 'react-icons/fa6';

interface PropertyMarkerProps {
  property: any;
  hoveredId: string | null;
  onSelect: (property: any) => void;
  resultsCount: number;
}

const PropertyMarker: React.FC<PropertyMarkerProps> = ({ property, hoveredId, onSelect, resultsCount }) => {
  const isRV = property.type === 'RV' || property.type === 'RV Park';
  const isHovered = property._id === hoveredId;
  const intensity = (property.leadCount / (property.globalAvgLeads || 5)) * 1.5;
  const isHighIntensity = intensity > 1.2;
  const isUrgent = property.leadCount > 10;

  let RVIcon = FaCaravan;
  if (property.rv_type?.includes('Class')) RVIcon = FaBus;
  else if (property.rv_type?.includes('Trailer') || property.rv_type?.includes('Fifth') || property.rv_type?.includes('Hauler')) RVIcon = FaTrailer;

  const getMarkerPriceDisplay = () => {
    if (property.price && property.price > 0) {
      return `$${property.price.toLocaleString()}`;
    }
    if (property.rates?.monthly) {
      return `$${property.rates.monthly.toLocaleString()}/mo`;
    }
    if (property.rates?.weekly) {
      return `$${property.rates.weekly.toLocaleString()}/wk`;
    }
    if (property.rates?.nightly) {
      return `$${property.rates.nightly.toLocaleString()}/night`;
    }
    return '$0';
  };

  return (
    <Marker
      longitude={property.location_geo.coordinates[0]}
      latitude={property.location_geo.coordinates[1]}
      anchor="bottom"
      onClick={e => {
        e.originalEvent.stopPropagation();
        onSelect(property);
      }}
    >
      <div className={`relative flex flex-col items-center group cursor-pointer transition-all duration-500 ${isHovered ? 'scale-125 z-50' : 'hover:scale-110'}`}>
        {isHovered && (
          <div className="absolute -top-8 bg-slate-900/90 text-[8px] font-black text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/50 uppercase tracking-widest whitespace-nowrap z-50">
            Priority target: {property.name}
          </div>
        )}
        {/* Organic Sunset Glow (Radial Gradient) */}
        <div 
          className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none transition-all duration-1000 ease-out'
          style={{
            width: `${40 + (property.leadCount * 10)}px`,
            height: `${40 + (property.leadCount * 10)}px`,
            background: `radial-gradient(circle, rgba(249, 115, 22, ${0.1 + Math.min(property.leadCount * 0.05, 0.4)}) 0%, rgba(249, 115, 22, 0) 70%)`,
            opacity: isHighIntensity ? 1 : 0.6,
            transform: `translate(-50%, -20%) scale(${isHovered ? 1.2 : 1})`,
          }}
        />

        <div className={`bg-white text-[10px] font-black px-2 py-1 rounded-full shadow-xl mb-1 transition-all duration-300 ${isRV ? 'text-green-600 border border-green-500' : 'text-blue-600 border border-blue-500'} ${resultsCount > 8 && !isHovered ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'} ${isHovered ? 'ring-2 ring-blue-500 ring-offset-1' : ''} relative z-10`}>
          {getMarkerPriceDisplay()}
        </div>
        <div className={`p-2 rounded-full border-2 border-white shadow-2xl transition-all duration-500 group-hover:shadow-blue-500/50 ${isRV ? 'bg-green-500' : 'bg-blue-600'} ${isHovered || isHighIntensity ? 'bg-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.8)]' : ''} ${isUrgent ? 'animate-pulse ring-4 ring-red-500/50' : ''} relative z-10`}
          style={{
            boxShadow: isHighIntensity ? `0 0 ${15 * intensity}px rgba(59, 130, 246, 0.6)` : 'none'
          }}
        >
          {isRV && !isHovered ? <RVIcon className="text-white text-xs" /> : <FaHouse className="text-white text-xs" />}
        </div>
      </div>
    </Marker>
  );
};

export default memo(PropertyMarker);

