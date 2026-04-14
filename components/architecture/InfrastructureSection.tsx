'use client';

import React from 'react';
import { FaServer, FaLayerGroup, FaDatabase } from 'react-icons/fa';

const InfrastructureSection = () => {
  return (
    <section className='space-y-6'>
      <div className='flex items-center gap-4 text-blue-400'>
        <FaServer size={32} />
        <h2 className='text-3xl font-black uppercase tracking-tight'>Core Infrastructure</h2>
      </div>
      
      <div className='bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl'>
        <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
          <FaLayerGroup className='text-blue-500' /> Modern Web Architecture
        </h3>
        <p className='text-sm text-slate-400 leading-relaxed mb-6'>
          Built on a modern framework utilizing server-side rendering for optimized data delivery and client-side interactivity for a seamless user experience. API endpoints are deployed on global edge networks for minimal latency.
        </p>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] font-mono'>
          <div className='bg-black/40 p-3 rounded-xl border border-white/5'>
            <span className='text-blue-400 block mb-1 font-bold'>DATA MANAGEMENT</span>
            - Server-Side Rendering (SSR)<br/>
            - Optimized Route Handlers<br/>
            - Scalable Data Fetching
          </div>
          <div className='bg-black/40 p-3 rounded-xl border border-white/5'>
            <span className='text-blue-400 block mb-1 font-bold'>SECURITY FRAMEWORK</span>
            - Identity & Access Management<br/>
            - Secure Authentication Flows<br/>
            - Enterprise Session Handling
          </div>
        </div>
      </div>

      <div className='bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl'>
        <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
          <FaDatabase className='text-blue-500' /> Scalable Data Persistence
        </h3>
        <p className='text-sm text-slate-400 leading-relaxed mb-4'>
          A robust data layer manages property listings, lead engagement, and application state. Our schema design is optimized for high-speed retrieval and cross-referencing of architectural assets.
        </p>
        <div className='space-y-2 text-[10px] font-mono text-slate-500'>
          <div className='flex items-center gap-2'>
            <span className='bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded'>Properties</span> 
            <span>Spatial specifications and listing data.</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded'>Leads</span> 
            <span>Engagement metrics and trend analysis.</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded'>System</span> 
            <span>Application configuration and dynamic assets.</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InfrastructureSection;
