'use client';

import React from 'react';
import { FaCode, FaShieldAlt, FaSync, FaSave, FaBook } from 'react-icons/fa';
import { ABIDAN_DATA } from '@/constants/abidan';
import { VIBE_DICTIONARY } from '@/constants/vibes';

interface DevPortalSystemProps {
  isDevMode: boolean;
  setDevMode: (val: boolean) => void;
  selectedAbidan: any;
  setSelectedAbidan: (val: any) => void;
  branding: any;
  updateBranding: (val: any) => void;
  handleSetDefault: () => void;
  isSaving: boolean;
  ghostDeckConfig: any;
  updateGhostDeckConfig: (val: any) => void;
}

const DevPortalSystem: React.FC<DevPortalSystemProps> = ({
  isDevMode,
  setDevMode,
  selectedAbidan,
  setSelectedAbidan,
  branding,
  updateBranding,
  handleSetDefault,
  isSaving,
  ghostDeckConfig,
  updateGhostDeckConfig
}) => {
  return (
    <div className="space-y-6">
      {/* Global Switches */}
      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
        <h4 className="text-[10px] font-black uppercase text-blue-400 mb-4 tracking-widest flex items-center gap-2">
          <FaCode /> Core_Configuration
        </h4>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/70">Enable Wireframe Debug</span>
          <button 
            onClick={() => setDevMode(!isDevMode)}
            className={`w-10 h-5 rounded-full transition-all relative ${isDevMode ? 'bg-blue-600' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isDevMode ? 'right-1' : 'left-1'}`} />
          </button>
        </div>
      </div>

      {/* Mantle Selection */}
      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
        <h4 className="text-[10px] font-black uppercase text-purple-400 mb-4 tracking-widest flex items-center gap-2">
          <FaShieldAlt /> Agent_Profiles
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {ABIDAN_DATA.map(a => (
            <button
              key={a.id}
              onClick={() => setSelectedAbidan(a)}
              className={`p-2 rounded-xl border text-[9px] font-black uppercase tracking-tighter transition-all ${selectedAbidan.id === a.id ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-black/40 border-white/5 text-slate-500 hover:text-white hover:border-white/10'}`}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* Vibe Overrides */}
      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-[10px] font-black uppercase text-orange-400 tracking-widest flex items-center gap-2">
            <FaSync /> Interface_Themes
          </h4>
          <button 
            onClick={handleSetDefault}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-2 py-1 bg-blue-600/20 border border-blue-500/30 rounded-lg text-[8px] font-black text-blue-400 hover:bg-blue-600 hover:text-white transition-all uppercase disabled:opacity-50"
            title="Make Current Theme Default"
          >
            <FaSave size={10} className={isSaving ? 'animate-spin' : ''} />
            {isSaving ? 'Saving...' : 'Set_Default'}
          </button>
        </div>

        <div className="mb-4 p-3 bg-black/40 border border-white/5 rounded-xl">
          <span className="text-[8px] text-slate-500 uppercase tracking-widest block mb-2">Current_Protocol:</span>
          <div className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full border border-white/20" 
              style={{ backgroundColor: branding.primaryColor }}
            />
            <span className="text-[10px] font-mono text-white/80">
              {Object.entries(VIBE_DICTIONARY).find(([_, val]) => val.primaryColor === branding.primaryColor)?.[0] || 'Custom_Override'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.keys(VIBE_DICTIONARY).slice(0, 12).map(v => (
            <button
              key={v}
              onClick={() => updateBranding((VIBE_DICTIONARY as any)[v])}
              className={`px-3 py-1.5 bg-black/40 border rounded-lg text-[8px] font-bold transition-all uppercase ${
                branding.primaryColor === (VIBE_DICTIONARY as any)[v].primaryColor 
                  ? 'border-blue-500 text-blue-400' 
                  : 'border-white/5 text-slate-400 hover:text-blue-400 hover:border-blue-500/50'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Briefing Protocol */}
      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
        <h4 className="text-[10px] font-black uppercase text-green-400 mb-4 tracking-widest flex items-center gap-2">
          <FaBook /> Presentation_Settings
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/70 uppercase">Presentation Mode</span>
            <button 
              onClick={() => updateGhostDeckConfig({ presentationMode: !ghostDeckConfig.presentationMode })}
              className={`w-8 h-4 rounded-full transition-all relative ${ghostDeckConfig.presentationMode ? 'bg-green-600' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${ghostDeckConfig.presentationMode ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/70 uppercase">Auto-Flight Path</span>
            <button 
              onClick={() => updateGhostDeckConfig({ autoFlight: !ghostDeckConfig.autoFlight })}
              className={`w-8 h-4 rounded-full transition-all relative ${ghostDeckConfig.autoFlight ? 'bg-green-600' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${ghostDeckConfig.autoFlight ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/70 uppercase">Lock Orientation</span>
            <button 
              onClick={() => updateGhostDeckConfig({ lockOrientation: !ghostDeckConfig.lockOrientation })}
              className={`w-8 h-4 rounded-full transition-all relative ${ghostDeckConfig.lockOrientation ? 'bg-green-600' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${ghostDeckConfig.lockOrientation ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/70 uppercase font-bold text-green-400">Sequential Mode</span>
            <button 
              onClick={() => updateGhostDeckConfig({ 
                sequentialMode: !ghostDeckConfig.sequentialMode,
                autoFlight: true,
                lockOrientation: true
              })}
              className={`w-8 h-4 rounded-full transition-all relative ${ghostDeckConfig.sequentialMode ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${ghostDeckConfig.sequentialMode ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>
          
          <div className="h-[1px] w-full bg-white/5 my-1" />

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/70 uppercase">Auto-Play Slides</span>
            <button 
              onClick={() => updateGhostDeckConfig({ autoPlay: !ghostDeckConfig.autoPlay })}
              className={`w-8 h-4 rounded-full transition-all relative ${ghostDeckConfig.autoPlay ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${ghostDeckConfig.autoPlay ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>

          {ghostDeckConfig.autoPlay && (
            <div className="flex flex-col gap-1.5 px-1 py-1">
              <span className="text-[8px] text-slate-500 uppercase tracking-widest">Slide Duration (ms)</span>
              <input 
                type="range" 
                min="2000" 
                max="15000" 
                step="500"
                value={ghostDeckConfig.autoPlayDelay}
                onChange={(e) => updateGhostDeckConfig({ autoPlayDelay: parseInt(e.target.value) })}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-[8px] font-mono text-blue-400/60">
                <span>2s</span>
                <span>{ghostDeckConfig.autoPlayDelay}ms</span>
                <span>15s</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DevPortalSystem;
