'use client';

import React from 'react';
import { BuildingType } from '../hero/ProceduralBuilding';

interface ProceduralBuildingConfigProps {
  config: {
    type: BuildingType;
    color: string;
    seed: string | number;
  };
  onChange: (newConfig: any) => void;
}

const ProceduralBuildingConfig: React.FC<ProceduralBuildingConfigProps> = ({ config, onChange }) => {
  const types: BuildingType[] = ['GABLE_HOUSE', 'MODERN_CUBE', 'A_FRAME', 'RV_TRAILER', 'SKYSCRAPER_SLIM'];

  return (
    <div className="absolute top-24 left-6 z-30 bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl w-[200px] shadow-2xl space-y-4 animate-in fade-in slide-in-from-left-4 duration-500 pointer-events-auto">
      <div className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-2 border-b border-white/10 pb-2">
        Mesh Configuration
      </div>
      
      <div className="space-y-1">
        <label className="text-[8px] uppercase text-white/40 font-bold tracking-tighter">Template Type</label>
        <select 
          value={config.type} 
          onChange={(e) => onChange({ ...config, type: e.target.value as BuildingType })}
          className="w-full bg-white/5 border border-white/10 rounded-md text-[10px] text-white p-1.5 focus:outline-none focus:border-blue-500/50 cursor-pointer"
        >
          {types.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[8px] uppercase text-white/40 font-bold tracking-tighter">Primary Color</label>
        <div className="flex gap-2">
          <input 
            type="color" 
            value={config.color} 
            onChange={(e) => onChange({ ...config, color: e.target.value })}
            className="w-8 h-8 bg-transparent border-0 cursor-pointer p-0"
          />
          <input 
            type="text" 
            value={config.color} 
            onChange={(e) => onChange({ ...config, color: e.target.value })}
            className="flex-1 bg-white/5 border border-white/10 rounded-md text-[10px] text-white p-1.5 focus:outline-none focus:border-blue-500/50 uppercase font-mono"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[8px] uppercase text-white/40 font-bold tracking-tighter">Geometric Seed</label>
        <input 
          type="text" 
          value={config.seed} 
          onChange={(e) => onChange({ ...config, seed: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-md text-[10px] text-white p-1.5 focus:outline-none focus:border-blue-500/50 font-mono"
          placeholder="Enter seed..."
        />
      </div>

      <button 
        onClick={() => onChange({ ...config, seed: Math.random().toString(36).substring(7) })}
        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-[8px] font-black uppercase rounded-lg transition-all shadow-lg shadow-blue-900/20"
      >
        Randomize Geometry
      </button>
    </div>
  );
};

export default ProceduralBuildingConfig;
