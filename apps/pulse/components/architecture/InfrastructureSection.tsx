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
          Built on Next.js 14 utilizing React Server Components (RSC) and <strong>Partial Prerendering (PPR)</strong> for extreme performance. Critical page shells mount instantly via static delivery, while dynamic <strong>Streaming Suspense Pockets</strong> hydrate data-heavy segments concurrently.
        </p>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] font-mono'>
          <div className='bg-[#081824]/45 p-3 rounded-xl border border-teal-200/10'>
            <span className='text-teal-200 block mb-1 font-bold'>STREAMING POCKETS</span>
            - Partial Prerendering (PPR)<br/>
            - Concurrent Segment Hydration<br/>
            - Zero-JS Layout Skeleton
          </div>
          <div className='bg-[#081824]/45 p-3 rounded-xl border border-violet-200/10'>
            <span className='text-violet-200 block mb-1 font-bold'>EDGE RUNTIME</span>
            - Global News API Distribution<br/>
            - Zero-Latency Briefing Cache<br/>
            - Regional Middleware Routing
          </div>
        </div>
      </div>

      <div className='waterlily-card p-8 rounded-2xl'>
        <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
          <FaDatabase className='text-amber-200' /> Hybrid Data Persistence
        </h3>
        <p className='text-sm text-teal-50/70 leading-relaxed mb-4'>
          A dual-engine data layer combining <strong>Supabase (PostgreSQL)</strong> for relational integrity and auth with <strong>MongoDB</strong> for flexible property metadata. We utilize <strong>Real-time Broadcasts</strong> for live inventory updates and tag-based revalidation for high-performance caching.
        </p>
        <div className='space-y-2 text-[10px] font-mono text-teal-100/55'>
          <div className='flex items-center gap-2'>
            <span className='bg-teal-500/15 text-teal-200 px-2 py-0.5 rounded'>Supabase</span> 
            <span>Auth, Relational Leads, and Real-time Inventory Sync.</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='bg-rose-500/15 text-rose-200 px-2 py-0.5 rounded'>MongoDB</span> 
            <span>High-volume spatial property metadata & history.</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='bg-violet-500/15 text-violet-200 px-2 py-0.5 rounded'>Revalidation</span> 
            <span>Tag-based unstable_cache invalidation across Edge regions.</span>
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
