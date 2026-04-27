'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeProvider';
import { FaFlask, FaCheck, FaTimes, FaGlobeAmericas, FaBolt, FaVideo } from 'react-icons/fa';
import VibeWorldExtractor from '@/components/VibeWorldExtractor';

const VibeWorldCard = ({ vibe, onApply }: { vibe: any, onApply: (vibe: any) => void }) => {
  return (
    <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 space-y-4 hover:border-blue-500/50 transition-all group">
      <div className="flex justify-between items-start">
        <div className="p-3 bg-white/5 rounded-2xl text-slate-400 group-hover:text-blue-400 transition-colors">
          <FaGlobeAmericas size={18} />
        </div>
        <div 
          className="w-4 h-4 rounded-full animate-pulse" 
          style={{ backgroundColor: vibe.visualParameters.meshColor, boxShadow: `0 0 10px ${vibe.visualParameters.meshColor}` }} 
        />
      </div>
      
      <div>
        <h4 className="text-sm font-black uppercase tracking-tight text-white mb-1">{vibe.name}</h4>
        <p className="text-[10px] text-slate-500 font-mono line-clamp-2 uppercase tracking-tighter leading-relaxed">
          {vibe.description}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 bg-black/20 rounded-lg text-[8px] font-mono text-slate-400 uppercase">
          Tone: {vibe.linguisticLogic.tone}
        </div>
        <div className="p-2 bg-black/20 rounded-lg text-[8px] font-mono text-slate-400 uppercase">
          Pacing: {vibe.linguisticLogic.pacing}
        </div>
      </div>

      <button
        onClick={() => onApply(vibe)}
        className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/40 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all"
      >
        Deploy World
      </button>
    </div>
  );
};

export default function VibeLabPage() {
  const { stagedBranding, stageBranding, confirmBranding, cancelStaging } = useTheme();
  const [vibes, setVibes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

const [isArchiving, setIsArchiving] = useState(false);

  const fetchVibes = async () => {
    setLoading(true);
    const res = await fetch('/api/jamie/vibes');
    const data = await res.json();
    setVibes(data.vibes || []);
    setLoading(false);
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      const res = await fetch('/api/admin/archive', { method: 'POST' });
      if (res.ok) {
        alert("Success: Intelligence Grid physicalized to /exports folder.");
      }
    } catch (err) {
      console.error("Archive Failed:", err);
    }
    setIsArchiving(false);
  };

  useEffect(() => {
    fetchVibes();
  }, []);

  const handleApplyVibe = (vibe: any) => {
    // Mapping our new Vibe model to the ThemeProvider's branding structure
    const config = {
      primaryColor: vibe.visualParameters.meshColor,
      mainBackground: '#020617',
      navBackground: '#000000',
      quadrants: {
        topLeft: { background: '#000000', color: vibe.visualParameters.meshColor },
        topRight: { background: '#020617', color: '#ffffff' },
        bottomLeft: { background: '#020617', color: '#ffffff' },
        bottomRight: { background: '#000000', color: vibe.visualParameters.meshColor }
      }
    };
    stageBranding(vibe.name, config);
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-32 pb-24 px-8">
      <header className="max-w-7xl mx-auto mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-blue-600 rounded-3xl shadow-[0_0_30px_rgba(37,99,235,0.4)]">
              <FaFlask size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter text-white leading-none">Vibe Lab</h1>
              <p className="text-[10px] font-mono text-blue-400 uppercase tracking-[0.5em] mt-2">Pick_a_Vibe_&_Extract_Worlds</p>
            </div>
          </div>
        </div>

        {stagedBranding ? (
          <div className="flex gap-4 p-2 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl animate-in fade-in slide-in-from-right-8">
            <button 
              onClick={cancelStaging}
              className="flex items-center gap-2 px-6 py-4 text-slate-400 hover:text-white transition-all font-black uppercase text-[10px] tracking-widest"
            >
              <FaTimes /> Cancel
            </button>
            <button 
              onClick={confirmBranding}
              className="flex items-center gap-3 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-blue-600/40 hover:scale-105 active:scale-95 transition-all"
            >
              <FaCheck /> Use this Vibe
            </button>
          </div>
        ) : (
          <button 
            onClick={handleArchive}
            disabled={isArchiving}
            className="flex items-center gap-3 px-10 py-6 bg-slate-900 border border-white/10 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.4em] shadow-2xl hover:bg-slate-800 transition-all disabled:opacity-50 group"
          >
            {isArchiving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FaGlobeAmericas size={16} className="text-blue-500 group-hover:rotate-180 transition-transform duration-1000" />
            )}
            {isArchiving ? 'Saving...' : 'Save to Hard Drive'}
          </button>
        )}
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Side: Extraction Workshop */}
        <div className="lg:col-span-5 space-y-8">
          <div className="p-8 bg-blue-600/10 border border-blue-500/20 rounded-[2.5rem]">
            <h3 className="text-blue-400 font-bold uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
              <FaBolt /> Vibe Extraction Active
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed font-mono">
              The Vibe Lab is ready. You can extract "worlds" from video clips and save them to your local dictionary.
            </p>
          </div>
          
          <VibeWorldExtractor onVibeExtracted={fetchVibes} />
        </div>

        {/* Right Side: Vibe Dictionary */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white/40 flex items-center gap-3">
              <FaGlobeAmericas /> Vibe Dictionary
            </h2>
            <span className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-mono text-slate-500 uppercase">
              {vibes.length} Saved Worlds
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="h-48 bg-white/5 rounded-3xl animate-pulse" />
              ))
            ) : (
              vibes.map((vibe) => (
                <VibeWorldCard 
                  key={vibe.vibeId} 
                  vibe={vibe} 
                  onApply={handleApplyVibe} 
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
