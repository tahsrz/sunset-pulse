'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TacticalCloth, { TacticalClothRef } from '../TacticalCloth';
import { RAMZA_SPEECH, MOODS } from '@/constants/ramza';
import { useJamieInsights } from '@/hooks/useJamieInsights';

interface RamzaSubjectCardProps {
  initialMass?: number;
  initialStiffness?: number;
  initialShine?: number;
  autoIntelligence?: boolean;
}

export default function RamzaSubjectCard({
  initialMass = 1.2,
  initialStiffness = 0.9,
  initialShine = 0.5,
  autoIntelligence = true
}: RamzaSubjectCardProps) {
  const clothRef = useRef<TacticalClothRef>(null);
  const { jamieInsights, loading } = useJamieInsights();
  const [speech, setSpeech] = useState("...seriously?");
  const [mood, setMood] = useState(MOODS.STABLE);
  const [interactionCount, setInteractionCount] = useState(0);
  const [mass, setMass] = useState(initialMass);
  const [stiffness, setStiffness] = useState(initialStiffness);
  const [shine, setShine] = useState(initialShine);
  const [isTalkActive, setIsTalkActive] = useState(false);
  const [talkInput, setTalkInput] = useState("");
  const [insightIndex, setInsightIndex] = useState(0);

  const pickSpeech = useCallback((key: keyof typeof RAMZA_SPEECH, vars: Record<string, string> = {}) => {
    const pool = RAMZA_SPEECH[key];
    let line = pool[Math.floor(Math.random() * pool.length)];
    Object.entries(vars).forEach(([k, v]) => {
      line = line.replace(`{${k}}`, v);
    });
    return line;
  }, []);

  const react = useCallback((key: keyof typeof RAMZA_SPEECH, vars: Record<string, string> = {}) => {
    setSpeech(pickSpeech(key, vars));
    setInteractionCount(prev => prev + 1);

    if (key === "pet") {
      clothRef.current?.pet();
    } else if (key === "poke") {
      clothRef.current?.applyForce(100, 100, 50, 15);
    }
  }, [pickSpeech]);

  // Jamie Intelligence Integration
  useEffect(() => {
    if (!autoIntelligence || loading || jamieInsights.length === 0) return;

    const intelInterval = setInterval(() => {
      const insight = jamieInsights[insightIndex % jamieInsights.length];
      const intelText = insight.properties?.description || insight.properties?.title;
      
      if (intelText) {
        setSpeech(`INTEL: ${intelText}`);
        clothRef.current?.applyForce(Math.random() * 194, Math.random() * 228, 40, 12);
        setInsightIndex(prev => prev + 1);
      }
    }, 15000); // New intel every 15s

    return () => clearInterval(intelInterval);
  }, [jamieInsights, loading, insightIndex, autoIntelligence]);

  useEffect(() => {
    if (interactionCount === 0) return;
    if (interactionCount < 5) setMood(MOODS.STABLE);
    else if (interactionCount < 12) setMood(MOODS.ANNOYED);
    else setMood(MOODS.DONE);
  }, [interactionCount]);

  // Idle chatter
  useEffect(() => {
    const interval = setInterval(() => {
      react("idle");
    }, 12000);
    return () => clearInterval(interval);
  }, [react]);

  return (
    <div className="flex flex-col md:flex-row gap-6 p-6 bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] w-fit shadow-2xl animate-in zoom-in-95 duration-500">
      {/* Left Column: Tactical Visualizer */}
      <div className="flex flex-col gap-4">
        <TacticalCloth 
          ref={clothRef}
          moodColor={mood.color} 
          status={interactionCount > 15 ? "CRITICAL" : "AWAKE"} 
        />
      </div>

      {/* Right Column: Controls & Speech */}
      <div className="flex flex-col gap-6 min-w-[320px]">
        {/* Speech Display */}
        <div className="min-h-[100px] flex items-center">
          <p className="text-3xl font-serif italic text-white/90 leading-tight">
            "{speech}"
          </p>
        </div>

        {/* Sliders */}
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span>Simulation_Mass</span>
              <span className="text-blue-400">{mass.toFixed(1)}</span>
            </div>
            <input 
              type="range" min="1" max="5" step="0.1" value={mass}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setMass(v);
                react("mass", { v: v.toFixed(1) });
              }}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span>Tensile_Stiffness</span>
              <span className="text-blue-400">{stiffness.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="0.1" max="1" step="0.05" value={stiffness}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setStiffness(v);
                react("stiff", { v: v.toFixed(2) });
              }}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span>Metalic_Shine</span>
              <span className="text-blue-400">{shine.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.05" value={shine}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setShine(v);
                react("shine", { v: v.toFixed(2) });
              }}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
          <div className="flex gap-2">
            <button 
              onClick={() => react("pet")}
              className="flex-1 py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/10 hover:text-white transition-all"
            >
              Pet
            </button>
            <button 
              onClick={() => react("poke")}
              className="flex-1 py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/10 hover:text-white transition-all"
            >
              Poke
            </button>
          </div>
          
          <div className="relative">
            {isTalkActive ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (talkInput.trim()) react("talk");
                  setTalkInput("");
                  setIsTalkActive(false);
                }}
                className="flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300"
              >
                <input 
                  autoFocus
                  type="text"
                  value={talkInput}
                  onChange={(e) => setTalkInput(e.target.value)}
                  placeholder="Say something to Ramza..."
                  className="w-full bg-black/40 border border-blue-500/30 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/20 outline-none focus:border-blue-500/60"
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 py-2 rounded-lg bg-blue-600 text-[8px] font-black uppercase text-white">Transmit</button>
                  <button type="button" onClick={() => setIsTalkActive(false)} className="px-4 py-2 rounded-lg bg-white/5 text-[8px] font-black uppercase text-white/40">Cancel</button>
                </div>
              </form>
            ) : (
              <button 
                onClick={() => setIsTalkActive(true)}
                className="w-full py-4 rounded-xl bg-blue-600/10 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-600 hover:text-white transition-all shadow-[0_0_20px_rgba(59,130,246,0.1)]"
              >
                Establish Uplink
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
