'use client';

import React from 'react';
import { FaPalette, FaBrain, FaWaveSquare, FaMagic } from 'react-icons/fa';

const VibeEngineSection = () => {
  return (
    <section className='col-span-1 xl:col-span-2 space-y-6 mt-12'>
      <div className='flex items-center gap-4 text-purple-400'>
        <FaPalette size={32} />
        <h2 className='text-3xl font-black uppercase tracking-tight'>Neural Styling Layer (VibeSimulacrum)</h2>
      </div>

      <div className='bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/20 p-8 rounded-3xl backdrop-blur-2xl relative overflow-hidden group'>
        <div className='absolute -right-20 -top-20 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full group-hover:bg-purple-500/20 transition-all duration-1000' />
        
        <div className='grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10'>
          <div>
            <h3 className='text-xl font-bold mb-4 flex items-center gap-2'>
              <FaBrain className='text-purple-400' /> Deterministic Aesthetic Morphing
            </h3>
            <p className='text-sm text-slate-400 leading-relaxed mb-6'>
              The <strong>VibeEngine</strong> establishes a deterministic relationship between AI linguistic output and UI aesthetics. Using 16-character <em>PulseHash</em> signatures, visual states are synchronized across React components and backend FFmpeg renderers.
            </p>
            <ul className='space-y-3 text-xs text-slate-500 font-mono'>
              <li className='flex items-center gap-2'>
                <div className='w-1 h-1 bg-purple-500 rounded-full' />
                LINGUISTIC_RESOLVER: SCANNING_FOR_VIBE_SIGNATURES
              </li>
              <li className='flex items-center gap-2'>
                <div className='w-1 h-1 bg-purple-500 rounded-full' />
                DYNAMIC_CSS_OVERRIDE: INJECTING_VARIABLE_ROOTS
              </li>
              <li className='flex items-center gap-2'>
                <div className='w-1 h-1 bg-purple-500 rounded-full' />
                VISUAL_HALLUCINATION: TRIGGERING_CSS_FILTERS
              </li>
            </ul>
          </div>

          <div className='space-y-6'>
            <div className='bg-black/60 p-6 rounded-2xl border border-white/5'>
              <div className='flex items-center justify-between mb-4'>
                <h4 className='text-[10px] font-black uppercase tracking-[0.2em] text-purple-400'>Vibe Registry v3.1</h4>
                <div className='flex gap-1'>
                  <div className='w-2 h-2 rounded-full bg-green-500' />
                  <div className='w-2 h-2 rounded-full bg-purple-500 animate-pulse' />
                  <div className='w-2 h-2 rounded-full bg-red-500' />
                </div>
              </div>
              <div className='space-y-4'>
                <div className='flex justify-between items-center text-[10px] font-mono'>
                  <span className='text-slate-500'>[vibe-maxxing]</span>
                  <span className='text-emerald-400'>HYPER-OPTIMIZED</span>
                </div>
                <div className='flex justify-between items-center text-[10px] font-mono'>
                  <span className='text-slate-500'>[vibe-expanding-brain]</span>
                  <span className='text-purple-400'>VISIONARY_RIFT</span>
                </div>
                <div className='flex justify-between items-center text-[10px] font-mono'>
                  <span className='text-slate-500'>[vibe-institutional]</span>
                  <span className='text-blue-400'>EQUITY_MAXIMA</span>
                </div>
              </div>
            </div>

            <div className='flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10'>
              <FaWaveSquare className='text-purple-500 animate-pulse' />
              <div className='flex-1'>
                <div className='text-[8px] font-bold text-slate-500 uppercase tracking-widest'>Neural Parity Sync</div>
                <div className='text-[10px] text-white font-mono'>FRO-PREVIEW // BAK-RENDER: 100% MATCH</div>
              </div>
              <FaMagic className='text-purple-300' />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VibeEngineSection;
