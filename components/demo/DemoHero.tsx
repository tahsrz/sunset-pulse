'use client';

import React from 'react';
import { FaRocket } from 'react-icons/fa';

const DemoHero = () => {
  return (
    <section className='max-w-4xl mb-24'>
      <div className='inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.4em] mb-8 border border-blue-500/20'>
        <FaRocket /> Platform Demonstration
      </div>
      <h1 className='text-7xl font-black uppercase italic tracking-tighter mb-8 leading-none text-white'>
        Predictive <span className='text-blue-500 underline decoration-blue-500/30 underline-offset-8'>Spatial</span> Intelligence.
      </h1>
      <p className='text-slate-400 text-xl font-medium leading-relaxed max-w-2xl italic'>
        Experience the fusion of high-fidelity spatial data and generative intelligence. Sunset Pulse streamlines property analysis and lead conversion through autonomous data processing.
      </p>
    </section>
  );
};

export default DemoHero;
