'use client';

import React from 'react';
import PropertyFiberViewer from '@/components/PropertyFiberViewer';

interface SpatialReconProps {
  property: any;
}

const SpatialRecon: React.FC<SpatialReconProps> = ({ property }) => {
  return (
    <div className='grid grid-cols-1 lg:grid-cols-12 gap-12'>
      <div className='lg:col-span-8'>
        <PropertyFiberViewer property={property} />
      </div>
      <div className='lg:col-span-4 space-y-8'>
        <div>
          <h3 className='text-2xl font-black uppercase italic tracking-tighter mb-4 text-white'>Spatial Data Analysis</h3>
          <p className='text-slate-400 text-sm leading-relaxed font-medium'>
            Analyze properties with high precision. The engine combines structural data and neighborhood context to create a professional profile for each listing.
          </p>
        </div>
        <div className='space-y-4'>
          <div className='p-4 bg-white/5 rounded-2xl border border-white/5'>
            <div className='text-[10px] font-bold uppercase text-blue-400 mb-1'>Structural Mapping</div>
            <div className='text-xs font-bold text-slate-300'>Detailed boundary analysis and real-time spatial context.</div>
          </div>
          <div className='p-4 bg-white/5 rounded-2xl border border-white/5'>
            <div className='text-[10px] font-bold uppercase text-blue-400 mb-1'>Environmental Simulation</div>
            <div className='text-xs font-bold text-slate-300'>Atmospheric rendering based on realistic temporal presets.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpatialRecon;
