'use client';

import { useState, useEffect } from 'react';
import { FaSave, FaTerminal, FaRobot, FaSync, FaShieldAlt, FaMicrochip, FaSlidersH, FaBrain } from 'react-icons/fa';
import { toast } from 'react-toastify';

const PERSONALITY_PRESETS = ['Aggressive', 'Supportive', 'Mysterious', 'Custom'];
const AVAILABLE_MODELS = [
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Fast)' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Balanced)' },
  { id: 'meta-llama/llama-3.1-405b-instruct:free', name: 'Llama 3.1 405B (Max Power)' },
  { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Secure)' },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Efficient)' }
];

export default function PromptEditorPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jamiePrompt, setJamiePrompt] = useState('');
  const [abidanPrompts, setAbidanPrompts] = useState<any>({});
  const [modelMatrix, setModelMatrix] = useState({
    primaryModel: 'llama-3.1-8b-instant',
    reconModel: 'meta-llama/llama-3.1-405b-instruct:free',
    miniModel: 'google/gemma-2-9b-it:free'
  });
  const [operationalSettings, setOperationalSettings] = useState({
    minJudges: 1,
    maxJudges: 4,
    personalityPreset: 'Aggressive'
  });

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const res = await fetch('/api/admin/prompts');
      const data = await res.json();
      setJamiePrompt(data.jamieSystemPrompt);
      setAbidanPrompts(data.abidanPrompts);
      if (data.modelMatrix) setModelMatrix(data.modelMatrix);
      if (data.operationalSettings) setOperationalSettings(data.operationalSettings);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to load intel protocols.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jamieSystemPrompt: jamiePrompt,
          abidanPrompts,
          modelMatrix,
          operationalSettings
        })
      });
      if (res.ok) {
        toast.success('Neural weights updated.');
      } else {
        throw new Error();
      }
    } catch (error) {
      toast.error('Grid synchronization failure.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <FaSync className="text-blue-500 animate-spin text-4xl" />
        <p className="text-blue-400 font-black uppercase tracking-[0.3em] text-xs">Syncing with Intelligence Grid...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-mono pb-24">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-end mb-12 border-b border-blue-500/30 pb-6">
          <div>
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <FaTerminal />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Admin Override</span>
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-blue-50">Command Center</h1>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
          >
            {saving ? <FaSync className="animate-spin" /> : <FaSave />}
            {saving ? 'Synchronizing...' : 'Upload to Grid'}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Top Controls: Model Matrix & Operational Settings */}
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">
            
            {/* Model Matrix */}
            <div className="bg-slate-900/50 border border-blue-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6 text-blue-400">
                <FaMicrochip />
                <h2 className="text-sm font-black uppercase tracking-widest">Model Matrix</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Primary Intelligence (Chat)</label>
                  <select 
                    className="w-full bg-slate-950 border border-white/5 rounded-lg p-3 text-xs text-blue-100 outline-none focus:border-blue-500/30"
                    value={modelMatrix.primaryModel}
                    onChange={(e) => setModelMatrix({...modelMatrix, primaryModel: e.target.value})}
                  >
                    {AVAILABLE_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Recon Intelligence (Deep Scan)</label>
                  <select 
                    className="w-full bg-slate-950 border border-white/5 rounded-lg p-3 text-xs text-blue-100 outline-none focus:border-blue-500/30"
                    value={modelMatrix.reconModel}
                    onChange={(e) => setModelMatrix({...modelMatrix, reconModel: e.target.value})}
                  >
                    {AVAILABLE_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Operational Thresholds */}
            <div className="bg-slate-900/50 border border-blue-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6 text-blue-400">
                <FaSlidersH />
                <h2 className="text-sm font-black uppercase tracking-widest">Operational Thresholds</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Abidan Judge Randomization</label>
                    <span className="text-[10px] font-black text-blue-400">{operationalSettings.minJudges} - {operationalSettings.maxJudges} Nodes</span>
                  </div>
                  <div className="flex gap-4">
                    <input 
                      type="range" min="1" max="8" 
                      className="w-full accent-blue-600"
                      value={operationalSettings.maxJudges}
                      onChange={(e) => setOperationalSettings({...operationalSettings, maxJudges: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Personality Matrix</label>
                  <div className="flex flex-wrap gap-2">
                    {PERSONALITY_PRESETS.map(p => (
                      <button
                        key={p}
                        onClick={() => setOperationalSettings({...operationalSettings, personalityPreset: p})}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          operationalSettings.personalityPreset === p 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                            : 'bg-slate-950 text-slate-500 hover:text-slate-300 border border-white/5'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Jamie Prompt */}
          <div className="lg:col-span-12">
            <div className="bg-slate-900/50 border border-blue-500/20 rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-3 mb-4 text-blue-400">
                <FaRobot />
                <h2 className="text-sm font-black uppercase tracking-widest">Jamie System Core</h2>
              </div>
              <textarea 
                className="w-full h-96 bg-slate-950 border border-white/5 rounded-xl p-4 text-xs leading-relaxed text-blue-100 focus:border-blue-500/50 outline-none scrollbar-hide"
                value={jamiePrompt}
                onChange={(e) => setJamiePrompt(e.target.value)}
              />
            </div>
          </div>

          {/* Abidan Judge Grid */}
          <div className="lg:col-span-12">
            <div className="flex items-center gap-3 mb-6 text-slate-400">
              <FaShieldAlt />
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-100">Abidan Judge Sub-Nodes</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.keys(abidanPrompts).map((key) => (
                <div key={key} className="bg-slate-900/30 border border-white/5 rounded-2xl p-6 hover:border-blue-500/20 transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                      Node: {key}
                    </h3>
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500/50 group-hover:bg-blue-400 group-hover:animate-pulse" />
                  </div>
                  <textarea 
                    className="w-full h-48 bg-slate-950 border border-white/5 rounded-xl p-4 text-[10px] leading-relaxed text-slate-300 focus:border-blue-500/50 outline-none scrollbar-hide"
                    value={abidanPrompts[key]}
                    onChange={(e) => setAbidanPrompts({...abidanPrompts, [key]: e.target.value})}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
