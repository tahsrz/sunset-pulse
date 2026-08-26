'use client';

import { useState } from 'react';
import { useTheme } from '@/context/ThemeProvider';
import { FaBrain, FaSave, FaUndo, FaMapMarkerAlt, FaUtensils, FaCheckCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase';
import MenuManager from '@/components/admin/MenuManager';

export default function IntelligenceConfigPage() {
  const { 
    intelligence, 
    setIntelligence 
  } = useTheme();

  const [saving, setSaving] = useState(false);
  const [stagedConfig, setStagedConfig] = useState(intelligence);

  const handleUpdate = (updates: any) => {
    setStagedConfig((prev: any) => ({
      ...prev,
      grill: { ...prev.grill, ...updates }
    }));
  };

  const handleCoordinateChange = (index: number, value: string) => {
    const newCoords = [...stagedConfig.grill.coordinates];
    newCoords[index] = parseFloat(value) || 0;
    handleUpdate({ coordinates: newCoords });
  };

  const saveToSupabase = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_config')
        .update({
          intelligence: stagedConfig,
          updated_at: new Date().toISOString()
        })
        .eq('agent_id', 'taz-realty-001');

      if (error) throw error;
      
      setIntelligence(stagedConfig);
      toast.success('Intelligence grid updated. Jamie is re-calculating proximities.');
    } catch (error: any) {
      toast.error(`Neural synchronization failure: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(stagedConfig) !== JSON.stringify(intelligence);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-mono pb-24">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-end mb-12 border-b border-blue-500/30 pb-6">
          <div>
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <FaBrain />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Neural Mapping</span>
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-blue-50">Intelligence Architect</h1>
          </div>
          <div className="flex gap-4">
            {hasChanges && (
              <button 
                onClick={() => setStagedConfig(intelligence)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/60 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all"
              >
                <FaUndo /> Revert
              </button>
            )}
            <button 
              onClick={saveToSupabase}
              disabled={saving || !hasChanges}
              className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
            >
              {saving ? <FaCheckCircle className="animate-pulse" /> : <FaSave />}
              {saving ? 'Synchronizing...' : 'Update Grid'}
            </button>
          </div>
        </header>

        {hasChanges && (
          <div className="bg-blue-600/20 border border-blue-500/50 rounded-2xl p-4 mb-8 flex items-center gap-4 animate-pulse">
            <FaExclamationTriangle className="text-blue-400" />
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">
              Intelligence parameters modified. Pulse scores will be recalculated upon synchronization.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Hub Identity */}
          <div className="lg:col-span-7 space-y-8">
            <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-8">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-8 flex items-center gap-2">
                <FaUtensils /> Local Intelligence Hub
              </h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Business Identity</label>
                    <input 
                      type="text" 
                      value={stagedConfig.grill.name}
                      onChange={(e) => handleUpdate({ name: e.target.value })}
                      placeholder="e.g., Sunset Gas & Grill"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Tactical Tagline</label>
                    <input 
                      type="text" 
                      value={stagedConfig.grill.tagline}
                      onChange={(e) => handleUpdate({ tagline: e.target.value })}
                      placeholder="e.g., Fresh Never Frozen Meat | Ask Us To Look At It!"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Operational Address</label>
                  <input 
                    type="text" 
                    value={stagedConfig.grill.address}
                    onChange={(e) => handleUpdate({ address: e.target.value })}
                    placeholder="101 S. Council, Sunset, TX 76270"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-blue-500 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 block">External Map Link (Google Maps)</label>
                  <input 
                    type="text" 
                    value={stagedConfig.grill.mapUrl || ''}
                    onChange={(e) => handleUpdate({ mapUrl: e.target.value })}
                    placeholder="https://www.google.com/maps/..."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Spatial Mapping */}
          <div className="lg:col-span-5 space-y-8">
            <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-8">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-8 flex items-center gap-2">
                <FaMapMarkerAlt /> Spatial Coordinates
              </h2>
              
              <div className="space-y-6">
                <div className="bg-blue-600/5 border border-blue-500/20 rounded-xl p-4 flex gap-3 mb-6">
                  <FaInfoCircle className="text-blue-400 mt-0.5 shrink-0" size={12} />
                  <p className="text-[9px] text-blue-200/70 leading-relaxed italic">
                    These coordinates serve as the "Zero Point" for neighborhood pulse scoring. Property desirability is calculated based on proximity to this node.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Longitude (X)</label>
                    <input 
                      type="number" 
                      step="0.0000001"
                      value={stagedConfig.grill.coordinates[0]}
                      onChange={(e) => handleCoordinateChange(0, e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Latitude (Y)</label>
                    <input 
                      type="number" 
                      step="0.0000001"
                      value={stagedConfig.grill.coordinates[1]}
                      onChange={(e) => handleCoordinateChange(1, e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <div className="aspect-video bg-slate-950 rounded-xl border border-white/5 overflow-hidden relative group">
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors">
                       <FaMapMarkerAlt className="text-blue-500 animate-bounce" size={24} />
                    </div>
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[8px] text-slate-400 uppercase font-black">
                      Spatial Node Locked
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-8">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-6 flex items-center gap-2">
                <FaBrain /> Jamie Awareness
              </h2>
              <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                Updating these parameters instantly synchronizes with Jamie's cognitive grid. 
              </p>
              <div className="flex items-center gap-3 bg-black/40 p-4 rounded-xl border border-white/5 italic">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
                <p className="text-[9px] text-slate-300">"Cognitive sync active. My analysis will now center around {stagedConfig.grill.name}."</p>
              </div>
            </section>
          </div>
        </div>

        {/* Tactical Menu Section */}
        <div className="mt-8">
          <MenuManager agentId="taz-realty-001" />
        </div>
      </div>
    </div>
  );
}
