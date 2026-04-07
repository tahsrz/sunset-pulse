'use client';

import React, { memo } from 'react';
import { Marker } from 'react-map-gl';
import { FaTags } from 'react-icons/fa6';

interface ValuationMarkerProps {
  valuation: any;
  hoveredId: string | null;
  onSelect: (valuation: any) => void;
}

const ValuationMarker: React.FC<ValuationMarkerProps> = ({ valuation, hoveredId, onSelect }) => {
  const isHovered = valuation._id === hoveredId;
  return (
    <Marker
      longitude={valuation.location_geo.coordinates[0]}
      latitude={valuation.location_geo.coordinates[1]}
      anchor="bottom"
      onClick={e => {
        e.originalEvent.stopPropagation();
        onSelect(valuation);
      }}
    >
      <div className={`flex flex-col items-center group cursor-pointer transition-all duration-500 ${isHovered ? 'scale-125 z-50' : 'hover:scale-110'}`}>
        <div className={`bg-emerald-600 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-xl mb-1 transition-all duration-300 ${isHovered ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}>
          ${valuation.estimate?.toLocaleString()}
        </div>
        <div className={`p-2 rounded-full border-2 border-white shadow-2xl bg-emerald-500 transition-all duration-500 ${isHovered ? 'shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-pulse' : ''}`}>
          <FaTags className="text-white text-xs" />
        </div>
      </div>
    </Marker>
  );
};

export default memo(ValuationMarker);

