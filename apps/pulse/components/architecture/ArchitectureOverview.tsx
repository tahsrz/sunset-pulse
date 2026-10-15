'use client';

import React from 'react';
import InfrastructureSection from './InfrastructureSection';
import IntelligenceLayer from './IntelligenceLayer';
import EngineSection from './EngineSection';
import VibeEngineSection from './VibeEngineSection';

const ArchitectureOverview = () => {
  return (
    <section id='architecture' className='waterlily-section border-t border-teal-200/10 px-6 py-16 font-sans text-slate-100 sm:py-20'>
      <div className='max-w-7xl mx-auto'>
        <header className='mb-10 border-b border-teal-200/15 pb-8 text-center md:mb-12 md:text-left'>
          <h2 className='text-4xl font-semibold tracking-tight waterlily-heading sm:text-5xl md:text-6xl'>
            How Sunset Pulse works
          </h2>
          <p className='mt-4 max-w-2xl text-sm leading-6 text-teal-100/70'>
            A look at how listings, seller tools, Jamie, and the rest of the site fit together.
          </p>
        </header>

        <div className='mb-16 grid grid-cols-1 gap-8 xl:grid-cols-2 sm:gap-10'>
          <InfrastructureSection />
          <IntelligenceLayer />
          <EngineSection />
          <VibeEngineSection />
        </div>

        <footer className='border-t border-white/5 pt-10 pb-8 sm:pt-12'>
          <div className='mx-auto max-w-4xl'>
            <h2 className='text-2xl font-semibold tracking-tight sm:text-3xl'>A request, from start to finish</h2>
            <p className='mt-3 max-w-3xl text-sm leading-7 text-teal-50/75 sm:text-base'>
              A page asks the server for the information it needs. The server checks access, reads from the right data store, and returns a clear result. Jamie can help make sense of that context; you decide what to do with it.
            </p>
          </div>
        </footer>
      </div>
    </section>
  );
};

export default ArchitectureOverview;
