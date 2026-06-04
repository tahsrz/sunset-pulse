'use client';

import React from 'react';
import { FaCube, FaNetworkWired, FaBolt, FaRocket } from 'react-icons/fa';

const EngineSection = () => {
  return (
    <section className='col-span-1 xl:col-span-2 space-y-6'>
      <div className='flex items-center gap-4 text-amber-200'>
        <FaCube size={32} />
        <h2 className='text-3xl font-black uppercase tracking-tight'>3D Spatial Engine</h2>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
        <div className='waterlily-card p-6 rounded-2xl'>
          <h4 className='font-bold mb-3 flex items-center gap-2'><FaNetworkWired className='text-amber-200' size={14}/> Atlas Globe Hub</h4>
          <p className='text-xs text-teal-50/70 leading-relaxed'>
            A high-performance geospatial core utilizing <strong>Three.js</strong> and <strong>React-Three-Fiber</strong> to render a navigable, high-fidelity globe for regional property distribution.
          </p>
        </div>
        <div className='waterlily-card p-6 rounded-2xl'>
          <h4 className='font-bold mb-3 flex items-center gap-2'><FaBolt className='text-rose-200' size={14}/> Virtual World Hub</h4>
          <p className='text-xs text-teal-50/70 leading-relaxed'>
            An immersive 3D interface for inspecting property context, neighborhood momentum, and spatial tradeoffs in a unified, walkable virtual environment.
          </p>
        </div>
        <div className='waterlily-card p-6 rounded-2xl'>
          <h4 className='font-bold mb-3 flex items-center gap-2'><FaRocket className='text-teal-200' size={14}/> Unified Property Stage</h4>
          <p className='text-xs text-teal-50/70 leading-relaxed'>
            Optimized rendering pipeline for high-fidelity property evaluation, ensuring complex architectural data is delivered with zero latency across all viewports.
          </p>
        </div>
      </div>
    </section>
  );
};

export default EngineSection;
