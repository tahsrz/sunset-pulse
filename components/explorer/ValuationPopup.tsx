'use client';

import React from 'react';
import { Popup } from 'react-map-gl';
import { FaTags } from 'react-icons/fa6';

interface ValuationPopupProps {
  valuation: any;
  onClose: () => void;
}

const ValuationPopup: React.FC<ValuationPopupProps> = ({ valuation, onClose }) => {
  return (
    <Popup
      longitude={valuation.location_geo.coordinates[0]}
      latitude={valuation.location_geo.coordinates[1]}
      anchor="top"
      onClose={onClose}
      closeOnClick={false}
      className="z-50"
    >
      <div className="p-3 max-w-[220px] bg-slate-900 text-white rounded-xl">
        <div className="flex items-center gap-2 mb-2 text-emerald-400">
          <FaTags className="text-sm" />
          <h4 className="font-black text-[10px] uppercase tracking-widest">Property Valuation</h4>
        </div>
        <h3 className="font-bold text-sm mb-1">{valuation.address}</h3>
        <div className="text-2xl font-black text-white italic tracking-tighter mb-2">
          ${valuation.estimate?.toLocaleString()}
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <span className="text-[8px] font-black uppercase text-slate-500">Confirmed Data</span>
          <span className="text-[8px] font-black uppercase text-blue-400">Jamie Review</span>
        </div>
      </div>
    </Popup>
  );
};

export default ValuationPopup;
