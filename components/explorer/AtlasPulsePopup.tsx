'use client';

import React from 'react';
import { Popup } from 'react-map-gl';
import { FaDatabase, FaLocationDot } from 'react-icons/fa6';
import type { AtlasPulsePlace } from './AtlasPulseMarker';

interface AtlasPulsePopupProps {
  place: AtlasPulsePlace;
  onClose: () => void;
}

const AtlasPulsePopup: React.FC<AtlasPulsePopupProps> = ({ place, onClose }) => {
  const { lat, lng } = place.atlasPulse.coordinates;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return (
    <Popup
      longitude={lng}
      latitude={lat}
      anchor="top"
      onClose={onClose}
      closeOnClick={false}
      className="z-50"
    >
      <div className="max-w-[260px] rounded-xl bg-slate-950 p-4 text-white">
        <div className="mb-3 flex items-center gap-2 text-amber-300">
          <FaLocationDot className="text-sm" />
          <h4 className="text-[10px] font-black uppercase tracking-widest">Atlas Pulse</h4>
        </div>
        <h3 className="text-base font-black">{place.name}</h3>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {place.region} / {place.atlasPulse.activeStage}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded bg-white/10">
          <div className="h-full rounded bg-amber-300" style={{ width: `${place.atlasPulse.bindingStrength}%` }} />
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-300">
          {place.atlasPulse.physicalAnchor}
        </p>
        <div className="mt-4 flex gap-2 text-[10px] font-black uppercase tracking-[0.12em]">
          <a href="/atlas" className="rounded bg-amber-300 px-3 py-2 text-slate-950">
            Open Atlas
          </a>
          <a href={`/api/atlas-pulse/${place.slug}`} className="rounded border border-white/10 px-3 py-2 text-slate-200">
            <span className="inline-flex items-center gap-1">
              <FaDatabase /> JSON
            </span>
          </a>
        </div>
      </div>
    </Popup>
  );
};

export default AtlasPulsePopup;
