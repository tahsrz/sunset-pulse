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
          <FaLayerGroup className='text-blue-500' /> Next.js 14 Architecture
        </h3>
        <p className='text-sm text-slate-400 leading-relaxed mb-6'>
          The application is built on the **Next.js 14 App Router**, utilizing Server Components for optimized data fetching and Client Components for interactive UI elements. 
          API routes are deployed using **Edge Runtime** to ensure low-latency responses for real-time data processing.
        </p>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] font-mono'>
          <div className='bg-black/40 p-3 rounded-xl border border-white/5'>
            <span className='text-blue-400 block mb-1 font-bold'>DATA STRATEGY</span>
            - Server-Side Rendering (SSR)<br/>
            - Dynamic Route Segments<br/>
            - Optimized Route Handlers
          </div>
          <div className='bg-black/40 p-3 rounded-xl border border-white/5'>
            <span className='text-blue-400 block mb-1 font-bold'>SECURITY & AUTH</span>
            - NextAuth.js Integration<br/>
            - Secure OAuth 2.0 Flow<br/>
            - Persistent Session Management
          </div>
        </div>
      </div>

      <div className='bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl'>
        <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
          <FaDatabase className='text-blue-500' /> MongoDB Data Cluster
        </h3>
        <p className='text-sm text-slate-400 leading-relaxed mb-4'>
          A robust NoSQL database manages property listings, lead information, and application configurations. The schema is optimized for rapid cross-referencing between commerce and real estate assets.
        </p>
        <div className='space-y-2 text-[10px] font-mono text-slate-500'>
          <div className='flex items-center gap-2'>
            <span className='bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded'>Properties</span> 
            <span>Spatial data and architectural specifications.</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded'>Leads</span> 
            <span>Engagement metrics and behavioral analysis.</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded'>System</span> 
            <span>Global application state and dynamic branding.</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InfrastructureSection;
