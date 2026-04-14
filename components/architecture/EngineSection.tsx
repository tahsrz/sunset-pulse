'use client';

import React from 'react';
import { FaCube, FaNetworkWired, FaBolt, FaRocket } from 'react-icons/fa';

const EngineSection = () => {
  return (
    <section className='col-span-1 xl:col-span-2 space-y-6'>
      <div className='flex items-center gap-4 text-orange-400'>
        <FaCube size={32} />
        <h2 className='text-3xl font-black uppercase tracking-tight'>Spatial Data Engine</h2>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
        <div className='bg-white/5 border border-white/10 p-6 rounded-2xl'>
          <h4 className='font-bold mb-3 flex items-center gap-2'><FaNetworkWired className='text-orange-400' size={14}/> Geometric Analysis</h4>
          <p className='text-xs text-slate-400 leading-relaxed'>
            High-performance spatial mathematics using optimized algorithms for 3D representation. We utilize advanced rotation matrices and custom projection logic to deliver accurate architectural visualizations.
          </p>
        </div>
        <div className='bg-white/5 border border-white/10 p-6 rounded-2xl'>
          <h4 className='font-bold mb-3 flex items-center gap-2'><FaBolt className='text-orange-400' size={14}/> Rendering Pipeline</h4>
          <p className='text-xs text-slate-400 leading-relaxed'>
            An optimized graphics pipeline featuring depth sorting and performance-focused culling algorithms, ensuring high-fidelity visuals with efficient resource utilization.
          </p>
        </div>
        <div className='bg-white/5 border border-white/10 p-6 rounded-2xl'>
          <h4 className='font-bold mb-3 flex items-center gap-2'><FaRocket className='text-orange-400' size={14}/> Interactive Simulation</h4>
          <p className='text-xs text-slate-400 leading-relaxed'>
            Physics-based navigation with refined momentum and damping controls, providing an intuitive and fluid exploration experience for complex data sets.
          </p>
        </div>
      </div>
    </section>
  );
};

export default EngineSection;
