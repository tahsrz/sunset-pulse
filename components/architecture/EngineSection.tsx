'use client';

import React from 'react';
import { FaCube, FaNetworkWired, FaBolt, FaRocket } from 'react-icons/fa';

const EngineSection = () => {
  return (
    <section className='col-span-1 xl:col-span-2 space-y-6'>
      <div className='flex items-center gap-4 text-orange-400'>
        <FaCube size={32} />
        <h2 className='text-3xl font-black uppercase tracking-tight'>Spatial Computation Engine</h2>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
        <div className='bg-white/5 border border-white/10 p-6 rounded-2xl'>
          <h4 className='font-bold mb-3 flex items-center gap-2'><FaNetworkWired className='text-orange-400' size={14}/> Linear Algebra & Projections</h4>
          <p className='text-xs text-slate-400 leading-relaxed'>
            A custom implementation of 3D mathematics using high-performance algorithms. We utilize **Euler Rotation Matrices** for orientation and a custom **Projection Matrix** to transform spatial data for visual representation.
          </p>
        </div>
        <div className='bg-white/5 border border-white/10 p-6 rounded-2xl'>
          <h4 className='font-bold mb-3 flex items-center gap-2'><FaBolt className='text-orange-400' size={14}/> Graphics Pipeline</h4>
          <p className='text-xs text-slate-400 leading-relaxed'>
            The engine features an optimized pipeline including **Backface Culling** and **Depth Sorting Algorithms**, ensuring accurate spatial representation and visual integrity without excessive overhead.
          </p>
        </div>
        <div className='bg-white/5 border border-white/10 p-6 rounded-2xl'>
          <h4 className='font-bold mb-3 flex items-center gap-2'><FaRocket className='text-orange-400' size={14}/> Dynamic Simulation</h4>
          <p className='text-xs text-slate-400 leading-relaxed'>
            The navigation mode utilizes momentum-based simulation with linear damping and angular inertia, allowing for smooth and intuitive exploration of architectural data.
          </p>
        </div>
      </div>
    </section>
  );
};

export default EngineSection;
