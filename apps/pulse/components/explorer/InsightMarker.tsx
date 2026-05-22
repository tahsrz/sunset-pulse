'use client';

import React, { memo } from 'react';
import { Marker } from 'react-map-gl';
import { FaBrain } from 'react-icons/fa6';

interface InsightMarkerProps {
  dream: any;
  onSelect: (dream: any) => void;
}

const InsightMarker: React.FC<InsightMarkerProps> = ({ dream, onSelect }) => {
  if (!dream.geometry || !dream.geometry.coordinates) {
    console.warn(`[InsightMarker]: Dream ${dream.id} is missing spatial data. Skipping render.`);
    return null;
  }

  return (
    <Marker
      longitude={dream.geometry.coordinates[0]}
      latitude={dream.geometry.coordinates[1]}
      anchor="bottom"
      onClick={e => {
        e.originalEvent.stopPropagation();
        onSelect(dream);
      }}
    >
      <div className="bg-amber-500 p-2 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-125 transition-transform animate-pulse">
        <FaBrain className="text-white text-xs" />
      </div>
    </Marker>
  );
};

export default memo(InsightMarker);

