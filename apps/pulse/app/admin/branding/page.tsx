'use client';

import { useState } from 'react';
import { useTheme } from '@/context/ThemeProvider';
import { FaPaintBrush, FaSave, FaUndo, FaFont, FaFillDrip, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase';
import QuadrantArchitect from '@/components/admin/QuadrantArchitect';

const PRESET_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0f172a'];
const FONTS = ['Inter', 'Roboto Mono', 'Space Grotesk', 'Outfit', 'System-ui'];

export default function BrandingConfigPage() {
  const { 
    agentId,
    branding, 
    stagedBranding, 
    stageBranding, 
    confirmBranding, 
    cancelStaging 
  } = useTheme();

  const [saving, setSaving] = useState(false);
  const activeBranding = stagedBranding || branding;

  const handleUpdate = (updates: any) => {
    stageBranding(updates);
  };

  const handleQuadrantUpdate = (quadrant: string, field: string, value: string) => {
    const updatedQuadrants = { ...activeBranding.quadrants };
    (updatedQuadrants as any)[quadrant] = { ...(updatedQuadrants as any)[quadrant], [field]: value };
    handleUpdate({ quadrants: updatedQuadrants });
  };

  const saveToSupabase = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_config')
        .upsert({
          agent_id: agentId,
          branding: activeBranding,
          updated_at: new Date().toISOString()
        }, { onConflict: 'agent_id' });

      if (error) throw error;
      
      confirmBranding();
      toast.success('Branding locked into the grid.');
    } catch (error: any) {
      toast.error(`Grid synchronization failure: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-mono pb-24">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-end mb-12 border-b border-blue-500/30 pb-6">
          <div>
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <FaPaintBrush />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Visual Override</span>
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-blue-50">Identity Architect</h1>
          </div>
          <div className="flex gap-4">
            {stagedBranding && (
              <button 
                onClick={cancelStaging}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/60 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all"
              >
                <FaUndo /> Discard
              </button>
            )}
            <button 
              onClick={saveToSupabase}
              disabled={saving}
              className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
            >
              {saving ? <FaCheckCircle className="animate-pulse" /> : <FaSave />}
              {saving ? 'Transmitting...' : 'Commit to Public'}
            </button>
          </div>
        </header>

        {stagedBranding && (
          <div className="bg-blue-600/20 border border-blue-500/50 rounded-2xl p-4 mb-8 flex items-center gap-4 animate-pulse">
            <FaExclamationTriangle className="text-blue-400" />
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">
              Visual modifications staged. These changes are local until you "Commit to Public".
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Core Identity */}
          <div className="lg:col-span-4 space-y-8">
            <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-6 flex items-center gap-2">
                <FaFillDrip /> Core Palette
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Primary Hex</label>
                  <div className="flex gap-4">
                    <input 
                      type="color" 
                      value={activeBranding.primaryColor}
                      onChange={(e) => handleUpdate({ primaryColor: e.target.value })}
                      className="w-12 h-12 rounded-lg bg-transparent cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={activeBranding.primaryColor}
                      onChange={(e) => handleUpdate({ primaryColor: e.target.value })}
                      className="flex-1 bg-slate-950 border border-white/5 rounded-lg px-4 text-xs font-mono uppercase"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_COLORS.map(c => (
                    <button 
                      key={c}
                      onClick={() => handleUpdate({ primaryColor: c })}
                      className="w-full aspect-square rounded-md border border-white/10 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-6 flex items-center gap-2">
                <FaFont /> Typography
              </h2>
              <div className="space-y-4">
                {FONTS.map(f => (
                  <button 
                    key={f}
                    onClick={() => handleUpdate({ fontFamily: f })}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-xs transition-all ${
                      activeBranding.fontFamily === f 
                        ? 'bg-blue-600/20 border-blue-500 text-white' 
                        : 'bg-slate-950 border-white/5 text-slate-500 hover:text-slate-300'
                    }`}
                    style={{ fontFamily: f }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Quadrant Architect */}
          <div className="lg:col-span-8">
            <QuadrantArchitect 
              quadrants={activeBranding.quadrants}
              borderRadius={activeBranding.borderRadius}
              mainBackground={activeBranding.mainBackground}
              handleUpdate={handleUpdate}
              handleQuadrantUpdate={handleQuadrantUpdate}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
