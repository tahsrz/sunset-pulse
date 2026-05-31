'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, Play, Activity, Mic2, Disc, Waves, ScrollText } from 'lucide-react';

interface Villager {
  charName: string;
  archetype: string;
  gold: number;
  alignment: number;
  rhythmComplexity: number;
  harmonicPurity: number;
  bpm: number;
  strudelPattern: string;
  suspicionLevel: number;
  recentActivityLog: string;
  level?: number;
}

interface SimulationState {
  population: Villager[];
  logs: string[];
}

export default function WorldOfStrudelDashboard() {
  const [state, setState] = useState<SimulationState>({ population: [], logs: [] });
  const [loading, setLoading] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  const initAudio = async () => {
    try {
      const { initStrudel } = await import('@strudel/web');
      await initStrudel();
      setAudioStarted(true);
    } catch (err) {
      console.error("Failed to init Strudel", err);
    }
  };

  const playPattern = async (name: string, pattern: string) => {
    if (!audioStarted) await initAudio();
    if (!pattern || pattern.trim() === "") {
      console.warn("Attempted to play empty pattern for", name);
      return;
    }
    
    try {
      const { evaluate, hush } = await import('@strudel/web');
      hush();
      if (currentlyPlaying === name) {
        setCurrentlyPlaying(null);
        return;
      }
      
      console.log(`[STRUDEL] Evaluating pattern for ${name}:`, pattern);
      
      // Ensure pattern is a valid non-empty string that looks like code
      if (pattern.length < 3) {
        console.error("[STRUDEL] Pattern too short to be valid code.");
        return;
      }

      evaluate(pattern);
      setCurrentlyPlaying(name);
    } catch (err) {
      console.error("Error playing pattern", err);
    }
  };

  const fetchState = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/simulation/state');
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch (err) {
      console.error("Failed to fetch simulation state", err);
    }
  };

  const startSimulation = async () => {
    setLoading(true);
    await fetch('http://localhost:5000/api/simulation/start', { method: 'POST' });
    await fetchState();
    setLoading(false);
  };

  const tickSimulation = async () => {
    setLoading(true);
    await fetch('http://localhost:5000/api/simulation/tick', { method: 'POST' });
    await fetchState();
    setLoading(false);
  };

  useEffect(() => {
    fetchState();
  }, []);

  const getArchetypeColor = (arch: string) => {
    switch (arch) {
      case 'Minimalist': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
      case 'Experimentalist': return 'text-purple-400 border-purple-400/30 bg-purple-400/10';
      case 'Traditionalist': return 'text-green-400 border-green-400/30 bg-green-400/10';
      case 'ChaosEngine': return 'text-red-400 border-red-400/30 bg-red-400/10';
      default: return 'text-slate-400 border-slate-400/30 bg-slate-400/10';
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] text-slate-300 p-8 font-mono">
      <header className="flex justify-between items-center mb-12 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-5xl font-black tracking-tighter text-white">
              STRUDEL<span className="text-orange-600">.</span>WARS
            </h1>
            <div className="px-2 py-0.5 bg-orange-600 text-[10px] text-white font-bold rounded">LIVE</div>
          </div>
          <p className="text-slate-500 mt-2 tracking-widest text-xs uppercase opacity-50">Evolutionary Algorithmic Composition Sandbox</p>
        </div>
        <div className="flex gap-4">
          {!audioStarted && (
            <button 
              onClick={initAudio}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black font-bold rounded-sm hover:bg-orange-500 hover:text-white transition-all"
            >
              <Volume2 size={18} /> Enable Audio
            </button>
          )}
          <button 
            onClick={startSimulation}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-white/10 hover:bg-slate-800 rounded-sm transition-all"
          >
            <Disc size={18} className={loading ? 'animate-spin' : ''} /> Init Session
          </button>
          <button 
            onClick={tickSimulation}
            disabled={loading || state.population.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-sm transition-all shadow-[0_0_20px_rgba(234,88,12,0.3)]"
          >
            <Mic2 size={18} /> Next Concert Cycle
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Console / Logs */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-sm">
            <h2 className="text-xs font-bold mb-6 flex items-center gap-2 text-white/40 uppercase tracking-widest">
              <ScrollText size={14} /> System Console
            </h2>
            <div className="space-y-2 h-[600px] overflow-y-auto pr-2 custom-scrollbar text-[11px] leading-relaxed">
              {state.logs.map((log, i) => (
                <div key={i} className="group flex gap-3 border-b border-white/5 pb-2 mb-2">
                  <span className="text-white/20">{i.toString().padStart(3, '0')}</span>
                  <span className={log.includes('SILENCE') ? 'text-red-500 font-bold' : 'text-slate-400'}>
                    {log}
                  </span>
                </div>
              ))}
              {state.logs.length === 0 && <p className="text-slate-700">Waiting for binary handshake...</p>}
            </div>
          </div>
        </div>

        {/* Center/Right: Grid */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {state.population.map((v, i) => (
              <div key={i} className={`bg-white/[0.02] border ${currentlyPlaying === v.charName ? 'border-orange-500 bg-orange-500/5' : 'border-white/5'} p-8 rounded-sm transition-all relative group`}>
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tighter mb-1 uppercase italic">{v.charName}</h3>
                    <div className={`px-2 py-0.5 text-[10px] font-bold border inline-block ${getArchetypeColor(v.archetype)}`}>
                      {v.archetype.toUpperCase()}
                    </div>
                  </div>
                  <button 
                    onClick={() => playPattern(v.charName, v.strudelPattern)}
                    className={`w-12 h-12 flex items-center justify-center rounded-full border ${currentlyPlaying === v.charName ? 'bg-orange-500 border-orange-500 text-white' : 'border-white/10 text-white hover:bg-white hover:text-black'} transition-all`}
                  >
                    {currentlyPlaying === v.charName ? <Activity size={24} /> : <Play size={24} />}
                  </button>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-[10px] text-white/30 uppercase font-bold">
                    <span>Rhythm Complexity</span>
                    <span>{v.rhythmComplexity}%</span>
                  </div>
                  <div className="h-1 bg-white/5 w-full">
                    <div className="h-full bg-blue-500" style={{ width: `${v.rhythmComplexity}%` }} />
                  </div>

                  <div className="flex justify-between text-[10px] text-white/30 uppercase font-bold pt-2">
                    <span>Harmonic Purity</span>
                    <span>{v.harmonicPurity}%</span>
                  </div>
                  <div className="h-1 bg-white/5 w-full">
                    <div className="h-full bg-green-500" style={{ width: `${v.harmonicPurity}%` }} />
                  </div>
                </div>

                <div className="bg-black/50 p-4 rounded-sm border border-white/5 mb-6">
                  <code className="text-[11px] text-orange-400 font-mono leading-tight break-all">
                    {v.strudelPattern}
                  </code>
                </div>

                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/20">
                  <div className="flex gap-4">
                    <span>BPM: {v.bpm}</span>
                    <span className={v.suspicionLevel > 50 ? 'text-red-600' : ''}>Suspicion: {v.suspicionLevel}</span>
                  </div>
                  <span>Level {v.level}</span>
                </div>

                {currentlyPlaying === v.charName && (
                  <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden">
                    <div className="h-full bg-orange-500 animate-pulse w-full" />
                  </div>
                )}
              </div>
            ))}
            
            {state.population.length === 0 && (
              <div className="col-span-full border border-dashed border-white/10 rounded-sm h-[400px] flex flex-col items-center justify-center text-slate-700">
                <Waves size={64} className="mb-6 opacity-10 animate-pulse" />
                <p className="text-xs tracking-widest uppercase">Initializing Sonic Ecology...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
        
        body {
          font-family: 'JetBrains Mono', monospace;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #222;
        }
      `}} />
    </div>
  );
}
