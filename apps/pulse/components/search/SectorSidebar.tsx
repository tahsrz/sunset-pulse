'use client';

import React from 'react';

interface SavedSector {
  id: number;
  name: string;
  polygon: string;
  timestamp: string;
}

interface SectorSidebarProps {
  savedSectors: SavedSector[];
  activeBoundaryName: string;
  onDeploy: (sector: SavedSector) => void;
  onRemove: (id: number) => void;
  onClose: () => void;
}

const SectorSidebar: React.FC<SectorSidebarProps> = ({ savedSectors, activeBoundaryName, onDeploy, onRemove, onClose }) => {
  return (
    <div className='absolute inset-y-0 left-0 w-64 z-30 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 shadow-2xl animate-in slide-in-from-left duration-300 p-6 overflow-y-auto'>
      <div className='flex items-center justify-between mb-8 text-white'>
        <h3 className='text-xs font-bold uppercase tracking-widest'>Saved Regions</h3>
        <button onClick={onClose} className='text-slate-500 hover:text-white transition-colors'>✕</button>
      </div>

      {savedSectors.length === 0 ? (
        <div className='py-12 text-center opacity-50'>
          <p className='text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed mb-4'>
            No custom search regions defined.
          </p>
          <p className='text-[9px] text-slate-600 italic'>Draw an area on the map to save a specific search boundary.</p>
        </div>
      ) : (
        <div className='space-y-3'>
          {savedSectors.map((sector) => (
            <div key={sector.id} className='group relative'>
              <button 
                onClick={() => onDeploy(sector)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${activeBoundaryName === sector.name ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
              >
                <div className='text-[10px] font-bold uppercase truncate mb-1'>{sector.name}</div>
                <div className='text-[8px] opacity-50 font-mono italic'>{new Date(sector.timestamp).toLocaleDateString()} ANALYSIS</div>
              </button>
              <button 
                onClick={() => onRemove(sector.id)}
                className='absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white w-4 h-4 rounded-full text-[8px] flex items-center justify-center hover:bg-red-600 transition-all shadow-lg'
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SectorSidebar;
