'use client';

import React from 'react';
import { FaShieldAlt } from 'react-icons/fa';
import InfrastructureSection from './InfrastructureSection';
import IntelligenceLayer from './IntelligenceLayer';
import EngineSection from './EngineSection';
import VibeEngineSection from './VibeEngineSection';

const ArchitectureOverview = () => {
  return (
    <section id='architecture' className='waterlily-section text-slate-100 p-8 md:p-20 font-sans border-t border-teal-200/10'>
      <div className='max-w-7xl mx-auto'>
        <header className='mb-16 border-b border-teal-200/15 pb-8 text-center md:text-left'>
          <h1 className='text-5xl md:text-7xl font-black tracking-tighter uppercase italic waterlily-heading'>
            Technical Architecture
          </h1>
          <p className='text-teal-100/60 font-mono text-sm mt-4 tracking-widest'>
            ENTERPRISE INFRASTRUCTURE & PROPERTY DATA
          </p>
        </header>

        <div className='grid grid-cols-1 xl:grid-cols-2 gap-12 mb-24'>
          <InfrastructureSection />
          <IntelligenceLayer />
          <EngineSection />
          <VibeEngineSection />
        </div>

        <footer className='border-t border-white/5 pt-16 pb-10'>
          <div className='max-w-4xl mx-auto text-center'>
          <div className='inline-block p-4 waterlily-button text-white rounded-full mb-8'>
              <FaShieldAlt size={40} />
            </div>
            <h2 className='text-4xl font-black uppercase tracking-tighter italic mb-8'>
              Technical Vision
            </h2>
            <div className='space-y-8 text-xl text-teal-50/70 font-serif italic leading-relaxed'>
              <p>
                "Sunset Pulse integrates high-performance geospatial analysis with data-driven search, making it easier to identify relevant properties and compare opportunities."
              </p>
              <p>
                "By leveraging a secure, cloud-native architecture, we deliver a platform that is precise, reliable, and capable of handling high-frequency market updates."
              </p>
            </div>
            <div className='mt-16 flex flex-col items-center'>
              <div className='h-px w-32 bg-teal-200/25 mb-6' />
              <div className='text-[10px] font-mono tracking-[0.6em] uppercase text-teal-100/55'>
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
