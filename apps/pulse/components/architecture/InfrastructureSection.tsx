'use client';

import React from 'react';
import { FaServer, FaLayerGroup, FaDatabase } from 'react-icons/fa';

const InfrastructureSection = () => {
  return (
    <section className='space-y-6'>
      <div className='flex items-center gap-4 text-teal-200'>
        <FaServer size={32} />
        <h2 className='text-2xl font-semibold tracking-tight'>The App and Its Data</h2>
      </div>
      
      <div className='waterlily-card p-8 rounded-2xl'>
        <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
          <FaLayerGroup className='text-teal-200' /> One App, with Clear Boundaries
        </h3>
        <p className='text-sm text-teal-50/70 leading-relaxed mb-5'>
          Sunset Pulse runs as a Next.js app on Vercel. Pages render on the server where that helps, while interactive pieces run in the browser. Server routes handle data requests and keep provider credentials away from the page.
        </p>
        <div className='flex flex-wrap gap-2 text-xs text-teal-100/75'>
          <span className='rounded-full border border-teal-200/15 px-3 py-1.5'>Next.js pages and APIs</span>
          <span className='rounded-full border border-teal-200/15 px-3 py-1.5'>Vercel hosting</span>
          <span className='rounded-full border border-teal-200/15 px-3 py-1.5'>Server-side access checks</span>
        </div>
      </div>

      <div className='waterlily-card p-8 rounded-2xl'>
        <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
          <FaDatabase className='text-amber-200' /> Where the Records Live
        </h3>
        <p className='text-sm text-teal-50/70 leading-relaxed mb-5'>
          The listing repository gives pages one consistent way to read property records. PostgreSQL through Supabase is the canonical store; MongoDB still serves older property paths while that migration continues.
        </p>
        <div className='grid gap-3 text-xs sm:grid-cols-2'>
          <div className='rounded-xl border border-teal-200/10 bg-[#081824]/45 p-4'>
            <span className='mb-1 block font-semibold text-teal-200'>Supabase / PostgreSQL</span>
            <span className='text-teal-100/60'>Canonical listing records and relational application data.</span>
          </div>
          <div className='rounded-xl border border-rose-200/10 bg-[#081824]/45 p-4'>
            <span className='mb-1 block font-semibold text-rose-200'>MongoDB</span>
            <span className='text-teal-100/60'>Compatibility store for legacy property routes.</span>
          </div>
        </div>
      </div>

      <div className='waterlily-card rounded-2xl p-8'>
        <h3 className='mb-4 text-lg font-semibold'>When a Listing Is Requested</h3>
        <ol className='grid gap-3 text-sm text-teal-50/70 sm:grid-cols-3'>
          <li className='rounded-xl border border-teal-200/10 bg-[#081824]/45 p-4'><span className='mb-1 block text-xs font-semibold text-teal-200'>01 · Ask</span>A page requests the listing details it needs.</li>
          <li className='rounded-xl border border-teal-200/10 bg-[#081824]/45 p-4'><span className='mb-1 block text-xs font-semibold text-teal-200'>02 · Read</span>The server checks access and calls the listing repository.</li>
          <li className='rounded-xl border border-teal-200/10 bg-[#081824]/45 p-4'><span className='mb-1 block text-xs font-semibold text-teal-200'>03 · Show</span>The page presents the result and its current availability.</li>
        </ol>
      </div>
    </section>
  );
};

export default InfrastructureSection;
