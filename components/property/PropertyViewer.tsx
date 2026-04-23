'use client';

import React, { useState } from 'react';
import { FaDatabase, FaVrCardboard, FaSlidersH, FaCube } from 'react-icons/fa';
import PropertyFiberViewer from '@/components/PropertyFiberViewer';
import ProceduralBuildingConfig from './ProceduralBuildingConfig';
import { BuildingType } from '../hero/ProceduralBuilding';

interface PropertyViewerProps {
  property: any;
}

const PropertyViewer: React.FC<PropertyViewerProps> = ({ property }) => {
  const [showConfig, setShowConfig] = useState(false);
  const [isNeuralMode, setIsNeuralMode] = useState(false);
  
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
            Interactive Asset Analysis // {isNeuralMode ? 'Data Layer' : '3D View'}
          </h3>
          <div className='text-[8px] text-blue-500/50 font-mono'>
            PROPERTY VISUALIZER V7.0
          </div>
        </div>

        {/* Narrative Hook */}
        <div className="hidden lg:block absolute left-1/2 -translate-x-1/2 bg-blue-600/10 border border-blue-500/20 px-4 py-2 rounded-xl">
           <p className="text-[9px] font-mono text-blue-300 uppercase tracking-widest text-center">
             Spatial Analysis: Interactive visualization for detailed property inspection and site evaluation.
           </p>
        </div>

        <div className='flex gap-2 bg-black/40 p-1.5 rounded-full border border-white/5'>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1.5 rounded-full transition-all ${showConfig ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
            title="Configure View"
          >
            <FaSlidersH size={12} />
          </button>
          
          <button 
            onClick={() => setIsNeuralMode(true)}
            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isNeuralMode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <FaDatabase size={10} /> Data Mode
          </button>
          <button 
            onClick={() => setIsNeuralMode(false)}
            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${!isNeuralMode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <FaCube size={12} /> 3D Mode
          </button>
        </div>
      </div>

      {showConfig && (
        <ProceduralBuildingConfig 
          config={buildingConfig} 
          onChange={setBuildingConfig} 
        />
      )}

      <div className='relative min-h-[500px] z-10'>
        <PropertyFiberViewer 
          property={property} 
          customConfig={buildingConfig}
          isNeuralMode={isNeuralMode}
        />
      </div>
    </div>
  );
};

export default PropertyViewer;
