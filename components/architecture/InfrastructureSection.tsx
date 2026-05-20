'use client';

import React from 'react';
import { FaServer, FaLayerGroup, FaDatabase } from 'react-icons/fa';

const InfrastructureSection = () => {
  return (
    <section className='space-y-6'>
      <div className='flex items-center gap-4 text-teal-200'>
        <FaServer size={32} />
        <h2 className='text-3xl font-black uppercase tracking-tight'>Core Infrastructure</h2>
      </div>
      
      <div className='waterlily-card p-8 rounded-2xl'>
        <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
          <FaLayerGroup className='text-teal-200' /> Modern Web Architecture
        </h3>
        <p className='text-sm text-teal-50/70 leading-relaxed mb-6'>
          Built on a modern framework utilizing server-side rendering for optimized data delivery and client-side interactivity for a seamless user experience. API endpoints are deployed on global edge networks for minimal latency.
        </p>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] font-mono'>
          <div className='bg-[#081824]/45 p-3 rounded-xl border border-teal-200/10'>
            <span className='text-teal-200 block mb-1 font-bold'>DATA MANAGEMENT</span>
            - Server-Side Rendering (SSR)<br/>
            - Optimized Route Handlers<br/>
            - Scalable Data Fetching
          </div>
          <div className='bg-[#081824]/45 p-3 rounded-xl border border-violet-200/10'>
            <span className='text-violet-200 block mb-1 font-bold'>SECURITY FRAMEWORK</span>
            - Identity & Access Management<br/>
            - Secure Authentication Flows<br/>
            - Enterprise Session Handling
          </div>
        </div>
      </div>

      <div className='waterlily-card p-8 rounded-2xl'>
        <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
          <FaDatabase className='text-amber-200' /> Scalable Data Persistence
        </h3>
        <p className='text-sm text-teal-50/70 leading-relaxed mb-4'>
          A robust data layer manages property listings, lead engagement, and application state. The schema is optimized for fast retrieval and cross-referencing of property records.
        </p>
        <div className='space-y-2 text-[10px] font-mono text-teal-100/55'>
          <div className='flex items-center gap-2'>
            <span className='bg-teal-500/15 text-teal-200 px-2 py-0.5 rounded'>Properties</span> 
            <span>Spatial specifications and listing data.</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='bg-rose-500/15 text-rose-200 px-2 py-0.5 rounded'>Leads</span> 
            <span>Engagement metrics and trend analysis.</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='bg-violet-500/15 text-violet-200 px-2 py-0.5 rounded'>System</span> 
            <span>Application configuration and dynamic media.</span>
          </div>
        </div>
      </div>

      <div className='waterlily-card p-8 rounded-2xl'>
        <h3 className='text-sm font-black text-amber-100 uppercase tracking-[0.3em] mb-4'>Performance Benchmarks</h3>
        <div className='grid grid-cols-2 gap-8'>
          <div>
            <div className='text-3xl font-black text-white italic'>&lt;10ms</div>
            <div className='text-[8px] font-bold text-teal-100/50 uppercase tracking-widest mt-1'>Search Latency</div>
          </div>
          <div>
            <div className='text-3xl font-black text-white italic'>100%</div>
            <div className='text-[8px] font-bold text-teal-100/50 uppercase tracking-widest mt-1'>Data Sync Rate</div>
          </div>
        </div>
        <p className='text-[10px] text-teal-100/55 mt-6 leading-relaxed italic'>
          "Architecture scales dynamically based on request volume, keeping property search fast and reliable."
        </p>
      </div>
    </section>
  );
};

export default InfrastructureSection;
