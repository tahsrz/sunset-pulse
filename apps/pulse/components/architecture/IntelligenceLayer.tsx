'use client';

import React from 'react';
import { FaRobot, FaMicrochip, FaPaintBrush } from 'react-icons/fa';

const IntelligenceLayer = () => {
  return (
    <section className='space-y-6'>
      <div className='flex items-center gap-4 text-rose-200'>
        <FaRobot size={32} />
        <h2 className='text-3xl font-black uppercase tracking-tight'>Search & Market Data</h2>
      </div>

      <div className='waterlily-card p-8 rounded-2xl'>
        <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
          <FaMicrochip className='text-rose-200' /> Semantic Search Optimization
        </h3>
        <p className='text-sm text-teal-50/70 leading-relaxed mb-6'>
          We use high-performance data processing to deliver precise search results. This architecture supports rapid query analysis, helping the platform identify relevant properties efficiently.
        </p>
        <div className='bg-[#081824]/60 p-4 rounded-2xl border border-rose-200/20 mb-6'>
          <div className='flex justify-between items-center mb-2'>
            <span className='text-[10px] font-bold text-rose-200'>SEARCH PIPELINE</span>
            <span className='text-[10px] font-mono text-teal-100/50'>MARKET DATA MAPPING</span>
          </div>
          <div className='h-1 w-full bg-slate-800 rounded-full overflow-hidden'>
            <div className='h-full bg-gradient-to-r from-rose-300 via-violet-300 to-teal-300 w-[95%]' />
          </div>
        </div>
        <h4 className='text-xs font-bold uppercase tracking-widest mb-3'>Integrated Market Feeds</h4>
        <p className='text-xs text-teal-100/55 leading-relaxed'>
          Real-time market insights and property metadata are integrated into the search engine, keeping results grounded in verified, current market data.
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
