'use client';

import React from 'react';
import { FaRobot, FaMicrochip, FaPaintBrush } from 'react-icons/fa';

const IntelligenceLayer = () => {
  return (
    <section className='space-y-6'>
      <div className='flex items-center gap-4 text-green-400'>
        <FaRobot size={32} />
        <h2 className='text-3xl font-black uppercase tracking-tight'>Generative Intelligence Layer</h2>
      </div>

      <div className='bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl'>
        <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
          <FaMicrochip className='text-green-500' /> Low-Latency Inference
        </h3>
        <p className='text-sm text-slate-400 leading-relaxed mb-6'>
          We utilize **Language Processing Units (LPUs)** to deliver near-instant response generation. This high-speed inference allows the application to respond dynamically to complex user queries without performance degradation.
        </p>
        <div className='bg-black/60 p-4 rounded-2xl border border-green-500/20 mb-6'>
          <div className='flex justify-between items-center mb-2'>
            <span className='text-[10px] font-bold text-green-400'>LLM PIPELINE</span>
            <span className='text-[10px] font-mono text-slate-500'>OPTIMIZED CONTEXT INJECTION</span>
          </div>
          <div className='h-1 w-full bg-slate-800 rounded-full overflow-hidden'>
            <div className='h-full bg-green-500 w-[95%] animate-pulse' />
          </div>
        </div>
        <h4 className='text-xs font-bold uppercase tracking-widest mb-3'>Context Integration</h4>
        <p className='text-xs text-slate-500 leading-relaxed'>
          Real-time data from local commerce and property reconnaissance are injected into the intelligence engine, ensuring all responses are grounded in current market reality.
        </p>
      </div>

      <div className='bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl'>
        <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
          <FaPaintBrush className='text-green-500' /> Dynamic UI Generation
        </h3>
        <p className='text-sm text-slate-400 leading-relaxed mb-4'>
          The interface is not static; it utilizes a mutation pipeline that updates the application's appearance based on user intent and AI analysis.
        </p>
        <div className='bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-[10px] text-green-300'>
          // DYNAMIC TRANSFORMATION FLOW<br/>
          1. NLP Analysis -&gt; Extraction<br/>
          2. Parameter Mapping -&gt; JSON Payload<br/>
          3. Global State Update -&gt; Branding Context<br/>
          4. DOM Mutation -&gt; CSS Variable Injection<br/>
          5. Seamless UI Transition
        </div>
      </div>
    </section>
  );
};

export default IntelligenceLayer;
