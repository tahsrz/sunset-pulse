'use client';

import React from 'react';
import { FaComments, FaBookOpen } from 'react-icons/fa';

const IntelligenceLayer = () => {
  return (
    <section className='space-y-6'>
      <div className='flex items-center gap-4 text-rose-200'>
        <FaComments size={28} aria-hidden='true' />
        <h2 className='text-2xl font-semibold tracking-tight'>Jamie and Research</h2>
      </div>

      <div className='waterlily-card p-8 rounded-2xl'>
        <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
          <FaComments className='text-rose-200' /> Help with the Next Conversation
        </h3>
        <p className='text-sm text-teal-50/70 leading-relaxed mb-5'>
          Jamie can use the current conversation and, when available, the selected listing or research context. The server gathers that information before sending the request to the configured AI provider. Jamie can suggest a reply or a next step; you review it before sharing.
        </p>
        <div className='grid gap-3 text-xs sm:grid-cols-3'>
          <div className='rounded-xl border border-rose-200/10 bg-[#081824]/45 p-4'><span className='mb-1 block font-semibold text-rose-200'>Your Question</span><span className='text-teal-100/60'>The conversation sets the task.</span></div>
          <div className='rounded-xl border border-rose-200/10 bg-[#081824]/45 p-4'><span className='mb-1 block font-semibold text-rose-200'>Relevant Context</span><span className='text-teal-100/60'>Listing or research details are added when available.</span></div>
          <div className='rounded-xl border border-rose-200/10 bg-[#081824]/45 p-4'><span className='mb-1 block font-semibold text-rose-200'>Your Review</span><span className='text-teal-100/60'>You choose what to keep and what to send.</span></div>
        </div>
      </div>

      <div className='waterlily-card p-8 rounded-2xl'>
        <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
          <FaBookOpen className='text-violet-200' /> Research Has Its Own Sources
        </h3>
        <p className='text-sm text-teal-50/70 leading-relaxed'>
          Jamie’s answers depend on the material available to that workflow. Listing details come from the listing repository; other research tools can use their connected sources or local indexes. If a source is unavailable, the app can say so instead of treating a guess as a fact.
        </p>
      </div>
    </section>
  );
};

export default IntelligenceLayer;
