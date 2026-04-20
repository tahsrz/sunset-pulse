'use client';

import React from 'react';
import { Popup } from 'react-map-gl';
import { FaBrain } from 'react-icons/fa6';

interface InsightPopupProps {
  dream: any;
  onClose: () => void;
}

const InsightPopup: React.FC<InsightPopupProps> = ({ dream, onClose }) => {
  if (!dream || !dream.geometry || !dream.geometry.coordinates || !dream.properties) {
    return null;
  }

  return (
    <Popup
      longitude={dream.geometry.coordinates[0]}
      latitude={dream.geometry.coordinates[1]}
      anchor="top"
      onClose={onClose}
      closeOnClick={false}
      className="z-50"
    >
      <div className="p-3 max-w-[220px] bg-slate-900 text-white rounded-xl">
        <div className="flex items-center gap-2 mb-2 text-amber-400">
          <FaBrain className="text-sm" />
          <h4 className="font-black text-[10px] uppercase tracking-widest">{dream.properties.category}</h4>
        </div>
        <h3 className="font-bold text-sm mb-1">{dream.properties.title}</h3>
        <p className="text-[10px] text-slate-300 leading-relaxed mb-3">
          {dream.properties.description}
        </p>
        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <span className="text-[8px] font-black uppercase text-slate-500">Intelligence: {dream.properties.intelligence_score}%</span>
          <span className="text-[8px] font-black uppercase text-blue-400">JAMIE_INTEL</span>
        </div>
      </div>
    </Popup>
  );
};

export default InsightPopup;
