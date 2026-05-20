'use client';

import React, { memo } from 'react';
import { Marker } from 'react-map-gl';
import { FaLocationDot } from 'react-icons/fa6';

export interface AtlasPulsePlace {
  slug: string;
  name: string;
  region: string;
  headline?: string;
  atlasPulse: {
    physicalAnchor: string;
    bindingStrength: number;
    activeStage: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
}

interface AtlasPulseMarkerProps {
  place: AtlasPulsePlace;
  onSelect: (place: AtlasPulsePlace) => void;
}

const AtlasPulseMarker: React.FC<AtlasPulseMarkerProps> = ({ place, onSelect }) => {
  const { lat, lng } = place.atlasPulse.coordinates;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return (
    <Marker
      longitude={lng}
      latitude={lat}
      anchor="bottom"
      onClick={event => {
        event.originalEvent.stopPropagation();
        onSelect(place);
      }}
    >
      <div className="group relative flex cursor-pointer flex-col items-center">
        <div className="absolute top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-amber-300/10 blur-xl transition group-hover:bg-amber-300/20" />
        <div className="mb-1 rounded-full border border-amber-200/50 bg-slate-950/90 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-100 shadow-2xl">
          {place.atlasPulse.bindingStrength}%
        </div>
        <div className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-amber-400 text-slate-950 shadow-[0_0_24px_rgba(251,191,36,0.55)] transition group-hover:scale-110">
          <FaLocationDot className="text-sm" />
        </div>
      </div>
    </Marker>
  );
};

export default memo(AtlasPulseMarker);
