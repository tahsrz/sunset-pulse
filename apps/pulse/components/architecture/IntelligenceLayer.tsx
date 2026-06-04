'use client';

import React from 'react';
import { FaRobot, FaMicrochip, FaPaintBrush } from 'react-icons/fa';

const IntelligenceLayer = () => {
  return (
    <section className='space-y-6'>
      <div className='flex items-center gap-4 text-rose-200'>
        <FaRobot size={32} />
        <h2 className='text-3xl font-black uppercase tracking-tight'>Intelligence & Research</h2>
      </div>

      <div className='waterlily-card p-8 rounded-2xl'>
        <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
          <FaMicrochip className='text-rose-200' /> Jamie Intelligence Engine
        </h3>
        <p className='text-sm text-teal-50/70 leading-relaxed mb-6'>
          Our core reasoning engine, <strong>Jamie</strong>, synthesizes raw market data into actionable intelligence. By processing distributed signals—from RSS feeds to TAH cartridges—Jamie provides risk assessments, neighborhood context, and strategic recommendations.
        </p>
        <div className='bg-[#081824]/60 p-4 rounded-2xl border border-rose-200/20 mb-6'>
          <div className='flex justify-between items-center mb-2'>
            <span className='text-[10px] font-bold text-rose-200'>TAH MEMORIA V4</span>
            <span className='text-[10px] font-mono text-teal-100/50'>KNOWLEDGE_CARTRIDGE_SYNC</span>
          </div>
          <div className='h-1 w-full bg-slate-800 rounded-full overflow-hidden'>
            <div className='h-full bg-gradient-to-r from-rose-300 via-violet-300 to-teal-300 w-[98%]' />
          </div>
        </div>
        <h4 className='text-xs font-bold uppercase tracking-widest mb-3'>LLM-Enhanced News Streams</h4>
        <p className='text-xs text-teal-100/55 leading-relaxed'>
          Utilizing local <strong>Ollama (Gemma-2)</strong> and remote LLM orchestration, we enhance standard RSS feeds with linguistic purification, removing noise and extracting high-signal market events.
        </p>
      </div>

      <div className='waterlily-card p-8 rounded-2xl'>
        <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
          <FaPaintBrush className='text-violet-200' /> Neural Vibe Engine (VibeSimulacrum)
        </h3>
        <p className='text-sm text-teal-50/70 leading-relaxed mb-4'>
          The platform interface can adapt visual styling based on selected modes and content context, keeping the experience consistent across pages.
        </p>
        <div className='bg-[#081824]/45 p-4 rounded-xl border border-teal-200/10 font-mono text-[10px] text-teal-200'>
          // VIBE_INJECTION_FLOW<br/>
          1. Jamie Linguistic Analysis<br/>
          2. Vibe Signature Extraction (PulseHash)<br/>
          3. Global VibeContext Dispatch<br/>
          4. Deterministic Component Morphing<br/>
          5. Visual Parity Verification
        </div>
      </div>
    </section>
  );
};

export default IntelligenceLayer;
