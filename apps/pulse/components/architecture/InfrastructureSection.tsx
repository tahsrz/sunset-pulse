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
          Built on Next.js 14 utilizing React Server Components (RSC) for optimized data delivery, combined with instant static page shells. <strong>Streaming Suspense Pockets</strong> allow critical layouts to mount instantly, concurrently streaming dynamic segments.
        </p>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] font-mono'>
          <div className='bg-[#081824]/45 p-3 rounded-xl border border-teal-200/10'>
            <span className='text-teal-200 block mb-1 font-bold'>STREAMING POCKETS</span>
            - Unblocked Page Shells<br/>
            - Concurrent Segment Hydration<br/>
            - Zero-JS Layout Skeleton
          </div>
          <div className='bg-[#081824]/45 p-3 rounded-xl border border-violet-200/10'>
            <span className='text-violet-200 block mb-1 font-bold'>SERVER-ONLY GATES</span>
            - RSC Compilation Firewall<br/>
            - Zero Browser-Bundle Leakage<br/>
            - Enforced Key Encapsulation
          </div>
        </div>
      </div>

      <div className='waterlily-card p-8 rounded-2xl'>
        <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
          <FaDatabase className='text-amber-200' /> Scalable Data Persistence
        </h3>
        <p className='text-sm text-teal-50/70 leading-relaxed mb-4'>
          Our robust database layer queries MongoDB/Mongoose directly. We optimize database reads using <strong>Granular Tag-Based Revalidation</strong>, caching server execution structures via <code>unstable_cache</code> and wiping them instantly using <code>revalidateTag</code> upon mutations.
        </p>
        <div className='space-y-2 text-[10px] font-mono text-teal-100/55'>
          <div className='flex items-center gap-2'>
            <span className='bg-teal-500/15 text-teal-200 px-2 py-0.5 rounded'>Properties</span> 
            <span>Cached under 'properties' tag. Purged on POST/PATCH.</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='bg-rose-500/15 text-rose-200 px-2 py-0.5 rounded'>Leads</span> 
            <span>Linear sigmoid velocity scoring & re-engagement hooks.</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='bg-violet-500/15 text-violet-200 px-2 py-0.5 rounded'>System</span> 
            <span>Dynamic TAH Expertise cartridges synced with Supabase.</span>
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
