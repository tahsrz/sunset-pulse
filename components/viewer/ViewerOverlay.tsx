'use client';

import React from 'react';

interface Telemetry {
  lat: number;
  lng: number;
  alt: number;
}

interface ViewerOverlayProps {
  propertyName: string;
  locationSnippet: string;
  isNavigationMode: boolean;
  isNeuralMode: boolean;
  telemetry: Telemetry;
  boundaryHit: boolean;
  onToggleNavigation: () => void;
}

const ViewerOverlay: React.FC<ViewerOverlayProps> = ({
  propertyName,
  locationSnippet,
  isNavigationMode,
  isNeuralMode,
  telemetry,
  boundaryHit,
  onToggleNavigation
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 p-6" onPointerDown={(e) => e.stopPropagation()}>
      {/* Boundary Warning */}
      {boundaryHit && (
        <div className="absolute inset-0 border-[10px] border-red-500/20 animate-pulse flex items-center justify-center">
          <div className="font-mono text-red-500 text-[8px] font-black uppercase tracking-[0.5em] bg-black/80 px-4 py-2 rounded-full border border-red-500/50 backdrop-blur-md">
            [ ! ] Navigation_Limit_Reached
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className={`font-mono text-[10px] tracking-[0.4em] uppercase flex items-center gap-2 ${isNavigationMode ? 'text-blue-400' : 'text-slate-400'}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${isNavigationMode ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]' : 'bg-slate-500'}`} />
            [ {isNavigationMode ? `VIRTUAL_VIEW_ACTIVE // ${propertyName.toUpperCase()}` : (isNeuralMode ? 'NEURAL_GRID_SCAN' : 'ORBITAL_SCAN_ACTIVE')} ]
          </div>
          <div className="font-mono text-[8px] text-white/20 uppercase tracking-widest">
            Location: {locationSnippet}...
          </div>
        </div>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            onToggleNavigation();
          }}
          className="pointer-events-auto bg-black/60 backdrop-blur-xl border border-white/10 px-4 py-1.5 rounded-full text-[8px] font-black text-white/70 hover:text-white transition-colors tracking-tighter uppercase"
        >
          {isNavigationMode ? 'Exit Navigation' : 'Interactive View'}
        </button>
      </div>

      {/* Telemetry Display */}
      {isNavigationMode && (
        <div className="absolute top-20 right-6 text-right font-mono space-y-1">
          <div className="text-[10px] text-blue-500 uppercase tracking-tighter">View Coordinates</div>
          <div className="text-sm text-white font-bold">LAT: {telemetry.lat.toFixed(6)}</div>
          <div className="text-sm text-white font-bold">LNG: {telemetry.lng.toFixed(6)}</div>
          <div className="text-sm text-blue-400 font-bold">ALT: {telemetry.alt.toFixed(1)} FT</div>
        </div>
      )}
      
      {/* Footer Info */}
      <div className="absolute bottom-6 left-6 font-mono text-[9px] text-white/30 uppercase tracking-widest">
        Sunset Render Engine v7.0.0 // {isNeuralMode ? 'Neural Hybrid' : 'Elite Recon'}
      </div>
      
      <div className="absolute bottom-6 right-6 font-mono text-[9px] text-white/30 uppercase tracking-widest">
        {isNavigationMode ? 'MOVE: WASD | FAST: SPACE | VERT: CTRL/SHIFT' : 'MODE: ORBITAL_SCAN'}
      </div>

      <div className={`recon-scan-line ${isNavigationMode ? 'bg-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'opacity-20'}`} />
    </div>
  );
};

export default ViewerOverlay;
