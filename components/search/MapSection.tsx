'use client';

import React from 'react';
import { FaMapMarkedAlt } from 'react-icons/fa';
import ExplorerMap from '@/components/ExplorerMap';
import SectorSidebar from './SectorSidebar';

interface MapSectionProps {
  properties: any[];
  savedSectors: any[];
  boundaryName: string;
  setBoundaryName: (val: string) => void;
  showSectorSidebar: boolean;
  setShowSectorSidebar: (val: boolean) => void;
  isPolygonActive: any;
  handlePolygonChange: (selection: any) => void;
  handlePropertySelect: (property: any) => void;
  handleSaveBoundary: () => void;
  handleDeploySector: (sector: any) => void;
  handleRemoveSector: (id: number) => void;
  hoveredPropertyId: string | null;
  activeRouteProperty: any;
}

const MapSection: React.FC<MapSectionProps> = ({
  properties, savedSectors, boundaryName, setBoundaryName,
  showSectorSidebar, setShowSectorSidebar, isPolygonActive,
  handlePolygonChange, handlePropertySelect, handleSaveBoundary,
  handleDeploySector, handleRemoveSector, hoveredPropertyId,
  activeRouteProperty
}) => {
  return (
    <div className='w-full md:w-2/5 h-[400px] md:h-full relative border-r border-slate-200'>
      <ExplorerMap 
        results={properties} 
        onSelectionChange={handlePolygonChange}
        onPropertySelect={handlePropertySelect}
        hoveredId={hoveredPropertyId}
        activeRouteProperty={activeRouteProperty}
      />

      <button 
        onClick={() => setShowSectorSidebar(!showSectorSidebar)}
        className='absolute top-4 left-4 z-20 bg-slate-900/90 text-white p-3 rounded-xl border border-white/10 shadow-2xl hover:bg-slate-800 transition-all'
      >
        <FaMapMarkedAlt className={`${showSectorSidebar ? 'text-blue-400' : 'text-slate-400'}`} />
      </button>

      {showSectorSidebar && (
        <SectorSidebar 
          savedSectors={savedSectors}
          activeBoundaryName={boundaryName}
          onDeploy={handleDeploySector}
          onRemove={handleRemoveSector}
          onClose={() => setShowSectorSidebar(false)}
        />
      )}

      {isPolygonActive && (
        <div className='absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2'>
          <div className='bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/10 flex flex-col gap-2 animate-in slide-in-from-top-4 duration-500'>
            <div className='flex items-center gap-2'>
              <FaMapMarkedAlt className='text-blue-400' size={12} />
              <span className='text-[8px] font-bold uppercase tracking-[0.2em] text-blue-400'>Custom Region Active</span>
            </div>
            <div className='flex gap-2'>
              <input 
                type='text' 
                placeholder='Region label...'
                className='bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white outline-none focus:border-blue-500 transition-all w-40'
                value={boundaryName}
                onChange={(e) => setBoundaryName(e.target.value)}
              />
              <button 
                onClick={handleSaveBoundary}
                className='bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all'
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapSection;
