'use client';

import React from 'react';
import { FaShieldAlt } from 'react-icons/fa';
import InfrastructureSection from './InfrastructureSection';
import IntelligenceLayer from './IntelligenceLayer';
import EngineSection from './EngineSection';
import VibeEngineSection from './VibeEngineSection';

const ArchitectureOverview = () => {
  return (
    <section id='architecture' className='waterlily-section border-t border-teal-200/10 px-6 py-16 font-sans text-slate-100 sm:py-20'>
      <div className='max-w-7xl mx-auto'>
        <header className='mb-10 border-b border-teal-200/15 pb-8 text-center md:mb-12 md:text-left'>
          <h2 className='text-4xl font-black tracking-tighter uppercase italic waterlily-heading sm:text-5xl md:text-6xl'>
            Technical Architecture
          </h2>
          <p className='mt-4 text-sm leading-6 text-teal-100/70'>
            ENTERPRISE INFRASTRUCTURE & PROPERTY DATA
          </p>
        </header>

        <div className='mb-16 grid grid-cols-1 gap-8 xl:grid-cols-2 sm:gap-10'>
          <InfrastructureSection />
          <IntelligenceLayer />
          <EngineSection />
          <VibeEngineSection />
        </div>

        <footer className='border-t border-white/5 pt-12 pb-8 sm:pt-16'>
          <div className='max-w-4xl mx-auto text-center'>
          <div className='inline-block p-4 waterlily-button text-white rounded-full mb-8'>
              <FaShieldAlt size={40} />
            </div>
            <h2 className='text-4xl font-black uppercase tracking-tighter italic mb-8'>
              Technical Vision
            </h2>
            <div className='space-y-6 text-base text-teal-50/75 leading-7 sm:text-lg sm:leading-8'>
              <p>
                "Sunset Pulse has evolved from a single search platform into a distributed intelligence suite, orchestrating specialized applications—from high-fidelity property discovery to automated lead engagement—into a unified monorepo ecosystem."
              </p>
              <p>
                "By leveraging a secure, workspace-aware architecture, we deliver a multi-node environment where spatial computing and predictive intelligence converge to handle high-frequency market updates with zero-latency precision."
              </p>
            </div>
            <div className='mt-12 flex flex-col items-center'>
              <div className='h-px w-32 bg-teal-200/25 mb-6' />
              <div className='text-xs font-semibold tracking-[0.18em] uppercase text-teal-100/70'>
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
