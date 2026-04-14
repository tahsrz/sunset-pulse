'use client';

import React from 'react';
import { FaRobot, FaMicrochip, FaPaintBrush } from 'react-icons/fa';

const IntelligenceLayer = () => {
  return (
    <section className='space-y-6'>
      <div className='flex items-center gap-4 text-green-400'>
        <FaRobot size={32} />
        <h2 className='text-3xl font-black uppercase tracking-tight'>AI & Intelligence Layer</h2>
      </div>

      <div className='bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl'>
        <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
          <FaMicrochip className='text-green-500' /> High-Performance Inference
        </h3>
        <p className='text-sm text-slate-400 leading-relaxed mb-6'>
          We leverage advanced processing units to deliver rapid response generation. This architecture supports high-speed inference, allowing the application to process complex user queries with precision and efficiency.
        </p>
        <div className='bg-black/60 p-4 rounded-2xl border border-green-500/20 mb-6'>
          <div className='flex justify-between items-center mb-2'>
            <span className='text-[10px] font-bold text-green-400'>AI PIPELINE</span>
            <span className='text-[10px] font-mono text-slate-500'>CONTEXTUAL DATA INTEGRATION</span>
          </div>
          <div className='h-1 w-full bg-slate-800 rounded-full overflow-hidden'>
            <div className='h-full bg-green-500 w-[95%] animate-pulse' />
          </div>
        </div>
        <h4 className='text-xs font-bold uppercase tracking-widest mb-3'>Data Grounding</h4>
        <p className='text-xs text-slate-500 leading-relaxed'>
          Real-time market insights and property data are integrated into the intelligence engine, ensuring all generated responses are grounded in accurate, current information.
        </p>
      </div>

      <div className='bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl'>
        <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
          <FaPaintBrush className='text-green-500' /> Adaptive Interface Design
        </h3>
        <p className='text-sm text-slate-400 leading-relaxed mb-4'>
          The user interface is dynamic, utilizing a transformation pipeline that adapts the application's visual state based on user intent and intelligent analysis.
        </p>
        <div className='bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-[10px] text-green-300'>
          // INTERFACE TRANSFORMATION FLOW<br/>
          1. Intent Analysis & Data Extraction<br/>
          2. Parameter Mapping & Logic Processing<br/>
          3. Global State & Branding Context Update<br/>
          4. Dynamic Style & Variable Injection<br/>
          5. Fluid UI Transitions
        </div>
      </div>
    </section>
  );
};

export default IntelligenceLayer;
