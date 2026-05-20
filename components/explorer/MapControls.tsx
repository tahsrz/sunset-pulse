'use client';

import React from 'react';
import { FaMapLocationDot, FaRoute } from 'react-icons/fa6';

interface MapControlsProps {
  showHeatmap: boolean;
  setShowHeatmap: (show: boolean) => void;
  showPOIs: boolean;
  setShowPOIs: (show: boolean) => void;
  showVisual: boolean;
  setShowVisual: (show: boolean) => void;
  showAtlasPulse?: boolean;
  setShowAtlasPulse?: (show: boolean) => void;
  showDirections: boolean;
}

const MapControls: React.FC<MapControlsProps> = ({ 
  showHeatmap, 
  setShowHeatmap, 
  showPOIs, 
  setShowPOIs,
  showVisual,
  setShowVisual,
  showAtlasPulse = false,
  setShowAtlasPulse,
  showDirections
}) => {
  return (
    <div className="absolute top-5 right-5 z-10 space-y-3">
      <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl max-w-[250px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 text-blue-400">
            <FaMapLocationDot />
            <h3 className="text-xs font-black uppercase tracking-widest">Map Layers</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`text-[8px] px-2 py-1 rounded font-black transition-all border ${showHeatmap ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}
            >
              HEATMAP
            </button>
            <button 
              onClick={() => setShowVisual(!showVisual)}
              className={`text-[8px] px-2 py-1 rounded font-black transition-all border ${showVisual ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}
            >
              VISUAL
            </button>
            <button 
              onClick={() => setShowPOIs(!showPOIs)}
              className={`text-[8px] px-2 py-1 rounded font-black transition-all border ${showPOIs ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}
            >
              POI
            </button>
            {setShowAtlasPulse && (
              <button
                onClick={() => setShowAtlasPulse(!showAtlasPulse)}
                className={`text-[8px] px-2 py-1 rounded font-black transition-all border ${showAtlasPulse ? 'bg-amber-400 border-amber-300 text-slate-950' : 'bg-white/5 border-white/10 text-slate-500'}`}
              >
                ATLAS
              </button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-slate-300 leading-relaxed font-medium">
          3D terrain and clustering are enabled. Toggle visual, heatmap, POI, or Atlas Pulse layers for local context.
        </p>
      </div>
      
      {showDirections && (
        <div className="bg-blue-600 p-4 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-right-10 duration-500">
          <div className="flex items-center gap-3 text-white">
            <FaRoute className="animate-pulse" />
            <h3 className="text-[10px] font-black uppercase tracking-widest">Active Route</h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapControls;
