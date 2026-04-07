'use client';

import React, { useState, useMemo } from 'react';
import { FaMicrochip, FaVrCardboard, FaSlidersH } from 'react-icons/fa';
import PropertyFiberViewer from '@/components/PropertyFiberViewer';
import SunsetPulseViewer from '../SunsetPulseViewer.jsx';
import ProceduralBuildingConfig from './ProceduralBuildingConfig';
import { BuildingType } from '../hero/ProceduralBuilding';

interface PropertyViewerProps {
  property: any;
  viewerType: 'fiber' | 'legacy';
  setViewerType: (type: 'fiber' | 'legacy') => void;
}

const PropertyViewer: React.FC<PropertyViewerProps> = ({ property, viewerType, setViewerType }) => {
  const [showConfig, setShowConfig] = useState(false);
  
  // Default type mapping
  const typeMap: Record<string, BuildingType> = {
    'Apartment': 'SKYSCRAPER_SLIM',
    'Condo': 'MODERN_CUBE',
    'House': 'GABLE_HOUSE',
    'Cabin Or Cottage': 'A_FRAME',
    'RV': 'RV_TRAILER',
    'RV Park': 'RV_TRAILER',
    'Studio': 'MODERN_CUBE',
  };

  const [buildingConfig, setBuildingConfig] = useState({
    type: typeMap[property.type] || 'GABLE_HOUSE' as BuildingType,
    color: '#3b82f6',
    seed: property._id || 'default'
  });

  return (
    <div className='bg-slate-950 p-2 rounded-[2rem] mt-8 shadow-2xl border border-white/5 relative overflow-hidden'>
      <div className='flex items-center justify-between px-8 py-6 relative z-20'>
        <div className='flex flex-col gap-1'>
          <h3 className='text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic'>
            3D Intelligence Grid // {viewerType === 'fiber' ? 'Elite Recon' : 'Neural Feed'}
          </h3>
          <div className='text-[8px] text-blue-500/50 font-mono'>
            {viewerType === 'fiber' ? 'R3F_SATELLITE_INTERPOLATION_ON' : 'CUSTOM_RASTERIZER_V2.0'}
          </div>
        </div>

        <div className='flex gap-2 bg-black/40 p-1.5 rounded-full border border-white/5'>
          {viewerType === 'fiber' && (
            <button 
              onClick={() => setShowConfig(!showConfig)}
              className={`p-1.5 rounded-full transition-all ${showConfig ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
              title="Configure Mesh"
            >
              <FaSlidersH size={12} />
            </button>
          )}
          <button 
            onClick={() => setViewerType('legacy')}
            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewerType === 'legacy' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <FaMicrochip size={10} /> Neural
          </button>
          <button 
            onClick={() => setViewerType('fiber')}
            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewerType === 'fiber' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <FaVrCardboard size={12} /> Elite
          </button>
        </div>
      </div>

      {showConfig && viewerType === 'fiber' && (
        <ProceduralBuildingConfig 
          config={buildingConfig} 
          onChange={setBuildingConfig} 
        />
      )}

      <div className='relative min-h-[500px] z-10'>
        {viewerType === 'fiber' ? (
          <PropertyFiberViewer 
            property={property} 
            customConfig={buildingConfig}
          />
        ) : (
          <SunsetPulseViewer objUrl={property.objUrl} property={property} />
        )}
      </div>
    </div>
  );
};

export default PropertyViewer;
