'use client';

import React from 'react';
import { FaShieldAlt } from 'react-icons/fa';
import InfrastructureSection from './InfrastructureSection';
import IntelligenceLayer from './IntelligenceLayer';
import EngineSection from './EngineSection';

const ArchitectureOverview = () => {
  return (
    <section id='architecture' className='bg-slate-950 text-slate-100 p-8 md:p-20 font-sans border-t border-white/5'>
      <div className='max-w-7xl mx-auto'>
        <header className='mb-16 border-b border-slate-800 pb-8 text-center md:text-left'>
          <h1 className='text-5xl md:text-7xl font-black tracking-tighter uppercase italic text-blue-500'>
            Technical Architecture
          </h1>
          <p className='text-slate-400 font-mono text-sm mt-4 tracking-widest'>
            ENTERPRISE INFRASTRUCTURE & INTELLIGENCE
          </p>
        </header>

        <div className='grid grid-cols-1 xl:grid-cols-2 gap-12 mb-24'>
          <InfrastructureSection />
          <IntelligenceLayer />
          <EngineSection />
        </div>

        <footer className='border-t border-white/5 pt-16 pb-10'>
          <div className='max-w-4xl mx-auto text-center'>
            <div className='inline-block p-4 bg-blue-600 text-white rounded-full mb-8 shadow-[0_0_30px_rgba(37,99,235,0.3)]'>
              <FaShieldAlt size={40} />
            </div>
            <h2 className='text-4xl font-black uppercase tracking-tighter italic mb-8'>
              Technical Vision
            </h2>
            <div className='space-y-8 text-xl text-slate-400 font-serif italic leading-relaxed'>
              <p>
                "Sunset Pulse represents the convergence of high-performance spatial computing and Jamie's DNA-level request analysis, eliminating the 'search fatigue' that defines legacy real estate platforms."
              </p>
              <p>
                "By determining the exact computational weight needed and scaling our architecture accordingly, we have created an intelligence layer that is both surgical and persistent."
              </p>
            </div>
            <div className='mt-16 flex flex-col items-center'>
              <div className='h-px w-32 bg-slate-800 mb-6' />
              <div className='text-[10px] font-mono tracking-[0.6em] uppercase text-slate-500'>
                Innovation // Integrity // Excellence
              </div>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
};

export default ArchitectureOverview;
