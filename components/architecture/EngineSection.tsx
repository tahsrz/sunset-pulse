'use client';

import React from 'react';
import { FaCube, FaNetworkWired, FaBolt, FaRocket } from 'react-icons/fa';

const EngineSection = () => {
  return (
    <section className='col-span-1 xl:col-span-2 space-y-6'>
      <div className='flex items-center gap-4 text-amber-200'>
        <FaCube size={32} />
        <h2 className='text-3xl font-black uppercase tracking-tight'>Spatial Data Engine</h2>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
        <div className='waterlily-card p-6 rounded-2xl'>
          <h4 className='font-bold mb-3 flex items-center gap-2'><FaNetworkWired className='text-amber-200' size={14}/> Spatial Asset Mapping</h4>
          <p className='text-xs text-teal-50/70 leading-relaxed'>
            Institutional-grade geospatial analysis using optimized algorithms for 3D representation. We utilize advanced projection logic to deliver accurate floor plans and site visualizations.
          </p>
        </div>
        <div className='waterlily-card p-6 rounded-2xl'>
          <h4 className='font-bold mb-3 flex items-center gap-2'><FaBolt className='text-rose-200' size={14}/> Visual Evaluation Core</h4>
          <p className='text-xs text-teal-50/70 leading-relaxed'>
            An optimized rendering pipeline designed for high-fidelity asset inspection, ensuring detailed visual data is delivered with institutional efficiency.
          </p>
        </div>
        <div className='waterlily-card p-6 rounded-2xl'>
          <h4 className='font-bold mb-3 flex items-center gap-2'><FaRocket className='text-teal-200' size={14}/> Dimensional Exploration</h4>
          <p className='text-xs text-teal-50/70 leading-relaxed'>
            Intuitive navigation with refined spatial controls, providing a fluid exploration experience for evaluating complex portfolio layouts.
          </p>
        </div>
      </div>
    </section>
  );
};

export default EngineSection;
