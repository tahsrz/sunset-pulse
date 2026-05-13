'use client';

import React, { useState } from 'react';
import BubbleTrouble from '@/components/BubbleTrouble';
import Insaniquarium from '@/components/Insaniquarium';
import { FaGamepad, FaArrowLeft, FaArrowRight, FaFish, FaBacterium } from 'react-icons/fa';

export default function ArcadePage() {
  const [activeGame, setActiveGame] = useState<'bubble' | 'insaniquarium'>('bubble');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 md:p-20 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 border-b border-slate-800 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic text-green-500">
              Arcade_Protocol
            </h1>
            <p className="text-slate-400 font-mono text-sm mt-4 tracking-widest">
              STRESS_TESTING_NEURAL_STYLING_LAYER // V3.3
            </p>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveGame('bubble')}
              className={`px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center gap-2 transition-all border
                ${activeGame === 'bubble' ? 'bg-green-600 border-green-400 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
            >
              <FaBacterium /> Bubble_Trouble
            </button>
            <button 
              onClick={() => setActiveGame('insaniquarium')}
              className={`px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center gap-2 transition-all border
                ${activeGame === 'insaniquarium' ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
            >
              <FaFish /> Insaniquarium_V3
            </button>
          </div>
        </header>

        <div className="flex flex-col xl:flex-row gap-12 items-start">
          <div className="flex-1 w-full flex justify-center">
            {activeGame === 'bubble' ? <BubbleTrouble /> : <Insaniquarium />}
          </div>

          <div className="w-full xl:w-80 space-y-8">
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-400">
                <FaGamepad /> {activeGame === 'bubble' ? 'Operation: Cloth Trouble' : 'Operation: Neural Tank'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                {activeGame === 'bubble' 
                  ? "This prototype demonstrates the high-performance reactivity of the TacticalCloth component. Each bubble is a live Verlet simulation reacting to physics and combat triggers."
                  : "Insaniquarium_V3 uses TacticalCloth to simulate biological entities. Track hunger, growth cycles, and economic output in a multi-mesh environment."}
              </p>
              
              <div className="space-y-4">
                <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                  <div className="text-[10px] font-bold text-green-500 uppercase mb-1">
                    {activeGame === 'bubble' ? 'Combat Reactivity' : 'Biological Simulation'}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">
                    {activeGame === 'bubble' 
                      ? "When hit, bubbles split and re-rasterize their neural meshes in real-time."
                      : "Fish hunger triggers color shifts (Green -> Red) and movement priority changes."}
                  </div>
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                  <div className="text-[10px] font-bold text-blue-500 uppercase mb-1">Neural Parity</div>
                  <div className="text-[9px] text-slate-500 font-mono">
                    Entities inherit current site "vibe" (colors, scanlines) from the VibeContext.
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-600/5 border border-blue-500/20 p-6 rounded-3xl backdrop-blur-xl">
              <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-4 italic">Developer Notes</h4>
              <p className="text-[10px] text-slate-500 leading-relaxed italic">
                {activeGame === 'bubble'
                  ? '"We repurposed the property visualization mesh for high-frequency collision testing."'
                  : '"The Insaniquarium protocol proves the scalability of the Abidan Core for managing 10+ concurrent cloth simulations."'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
