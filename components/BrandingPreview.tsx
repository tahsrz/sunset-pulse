'use client';

import React from 'react';
import { FaCogs } from 'react-icons/fa';

interface BrandingPreviewProps {
  onCancel: () => void;
  onConfirm: () => void;
}

const BrandingPreview: React.FC<BrandingPreviewProps> = ({ onCancel, onConfirm }) => {
  return (
    <div className="bg-slate-900 border-2 border-orange-500 rounded-[2rem] p-6 shadow-2xl animate-in zoom-in duration-500">
      <div className="flex items-center gap-3 mb-4 text-orange-500">
        <FaCogs className="animate-spin" />
        <h4 className="font-black uppercase text-xs tracking-widest">Theme Preview Active</h4>
      </div>
      <p className="text-slate-300 text-[10px] uppercase font-bold mb-6 leading-relaxed">
        Jamie has suggested a new visual theme. Would you like to apply these changes to the site?
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={onCancel}
          className="py-3 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-black uppercase hover:bg-slate-700 transition-all"
        >
          Discard
        </button>
        <button 
          onClick={onConfirm}
          className="py-3 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-orange-500/20 hover:scale-105 transition-all"
        >
          Apply Theme
        </button>
      </div>
    </div>
  );
};

export default BrandingPreview;
