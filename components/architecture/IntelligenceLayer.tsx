'use client';

import React from 'react';
import { FaRobot, FaMicrochip, FaPaintBrush } from 'react-icons/fa';

const IntelligenceLayer = () => {
  return (
    <section className='space-y-6'>
      <div className='flex items-center gap-4 text-green-400'>
        <FaRobot size={32} />
        <h2 className='text-3xl font-black uppercase tracking-tight'>Search & Data Intelligence</h2>
      </div>

      <div className='bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl'>
        <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
          <FaMicrochip className='text-green-500' /> Semantic Search Optimization
        </h3>
        <p className='text-sm text-slate-400 leading-relaxed mb-6'>
          We utilize high-performance data processing to deliver precise search results. This architecture supports rapid query analysis, allowing the platform to identify high-yield assets with institutional-grade efficiency.
        </p>
        <div className='bg-black/60 p-4 rounded-2xl border border-green-500/20 mb-6'>
          <div className='flex justify-between items-center mb-2'>
            <span className='text-[10px] font-bold text-green-400'>SEARCH PIPELINE</span>
            <span className='text-[10px] font-mono text-slate-500'>MARKET DATA MAPPING</span>
          </div>
          <div className='h-1 w-full bg-slate-800 rounded-full overflow-hidden'>
            <div className='h-full bg-green-500 w-[95%]' />
          </div>
        </div>
        <h4 className='text-xs font-bold uppercase tracking-widest mb-3'>Integrated Market Feeds</h4>
        <p className='text-xs text-slate-500 leading-relaxed'>
          Real-time market insights and property metadata are integrated into the search engine, ensuring all results are grounded in verified, current market data.
        </p>
      </div>

      <div className='bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl'>
        <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
          <FaPaintBrush className='text-green-500' /> Reactive Platform States
        </h3>
        <p className='text-sm text-slate-400 leading-relaxed mb-4'>
          The platform interface is dynamic, adapting its visual and functional state based on user criteria and market segment analysis.
        </p>
        <div className='bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-[10px] text-green-300'>
          // DATA PROCESSING FLOW<br/>
          1. Query Analysis & Asset Extraction<br/>
          2. Yield Mapping & Logic Processing<br/>
          3. Portfolio Context Updates<br/>
          4. Asset Class Filtering<br/>
          5. Visual State Transitions
        </div>
      </div>
    </section>
  );
};

export default IntelligenceLayer;
