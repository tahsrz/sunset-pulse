'use client';

import React from 'react';
import { FaPalette, FaBrain, FaWaveSquare, FaMagic } from 'react-icons/fa';

const VibeEngineSection = () => {
  return (
    <section className='col-span-1 xl:col-span-2 space-y-6 mt-12'>
      <div className='flex items-center gap-4 text-violet-200'>
        <FaPalette size={32} />
        <h2 className='text-2xl font-semibold tracking-tight'>Adaptive styling</h2>
      </div>

      <div className='waterlily-card p-8 rounded-2xl backdrop-blur-2xl relative overflow-hidden group'>
        <div className='absolute -right-20 -top-20 w-64 h-64 bg-violet-300/15 blur-[100px] rounded-full group-hover:bg-violet-300/25 transition-all duration-1000' />
        
        <div className='grid grid-cols-1 gap-8 relative z-10 md:grid-cols-2'>
          <div>
            <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
              <FaBrain className='text-violet-200' /> A little shift in tone
            </h3>
            <p className='text-sm text-teal-50/70 leading-relaxed mb-5'>
              Jamie’s reply can select one of a few visual modes. The VibeProvider applies that mode’s colors and supported effects to the page. It changes presentation only; listing details and your decisions stay the same.
            </p>
            <ul className='space-y-3 text-sm text-teal-100/65'>
              <li className='flex items-start gap-3'>
                <span className='mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-300' />
                <span><strong className='text-teal-50'>Color accents</strong> follow the active mode.</span>
              </li>
              <li className='flex items-start gap-3'>
                <span className='mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-300' />
                <span><strong className='text-teal-50'>Optional effects</strong> appear only for modes that support them.</span>
              </li>
              <li className='flex items-start gap-3'>
                <span className='mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-300' />
                <span><strong className='text-teal-50'>Studio filters</strong> change image previews, not listing photos.</span>
              </li>
            </ul>
          </div>

          <div className='space-y-4'>
            <div className='bg-[#081824]/60 p-6 rounded-2xl border border-teal-200/10'>
              <div className='mb-4 flex items-center gap-3'>
                <FaWaveSquare className='text-violet-200' aria-hidden='true' />
                <h4 className='text-base font-semibold text-violet-100'>What changes</h4>
              </div>
              <div className='space-y-3 text-sm text-teal-100/65'>
                <p>Page accents and a few decorative effects can respond to the current mode.</p>
                <p>In Studio, a chosen filter and its image settings produce a repeatable preview signature.</p>
              </div>
            </div>

            <div className='flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-teal-200/10'>
              <div className='flex-1'>
                <div className='text-xs font-semibold text-teal-50'>A visual choice, not a workflow change</div>
                <div className='mt-1 text-xs leading-5 text-teal-100/60'>The theme does not alter property data, permissions, or messages.</div>
              </div>
              <FaMagic className='mt-0.5 shrink-0 text-rose-200' aria-hidden='true' />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VibeEngineSection;
