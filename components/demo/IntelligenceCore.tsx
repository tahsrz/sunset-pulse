'use client';

import React from 'react';
import { FaBrain, FaSatellite, FaShieldAlt } from 'react-icons/fa';
import PulsarSprite from '@/components/PulsarSprite';

const IntelligenceCore = () => {
  return (
    <div className='flex flex-col items-center justify-center py-12 text-center'>
      <div className='mb-12'>
        <PulsarSprite intensity={1.5} status="ai" />
      </div>
      <h3 className='text-4xl font-black uppercase italic tracking-tighter mb-6 text-white'>Jamie: Intelligence Engine</h3>
      <p className='text-slate-400 max-w-2xl text-lg mb-12 font-medium'>
        Jamie is an autonomous research assistant. Utilizing extensive socioeconomic datasets, he provides persistent context across user sessions, predictive analysis, and professional data briefings.
      </p>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 w-full'>
        <div className='p-6 bg-blue-600/10 border border-blue-500/20 rounded-3xl'>
          <div className='text-2xl mb-4 text-blue-400'><FaBrain /></div>
          <h4 className='text-sm font-bold uppercase mb-2 text-white'>Persistent Memory</h4>
          <p className='text-[10px] text-slate-500 uppercase tracking-widest font-bold'>Ensures continuity and context retention throughout the user journey.</p>
        </div>
        <div className='p-6 bg-blue-600/10 border border-blue-500/20 rounded-3xl'>
          <div className='text-2xl mb-4 text-blue-400'><FaSatellite /></div>
          <h4 className='text-sm font-bold uppercase mb-2 text-white'>Data Triangulation</h4>
          <p className='text-[10px] text-slate-500 uppercase tracking-widest font-bold'>Analysis of multiple socioeconomic data points to predict market momentum.</p>
        </div>
        <div className='p-6 bg-blue-600/10 border border-blue-500/20 rounded-3xl'>
          <div className='text-2xl mb-4 text-blue-400'><FaShieldAlt /></div>
          <h4 className='text-sm font-bold uppercase mb-2 text-white'>Professional Summaries</h4>
          <p className='text-[10px] text-slate-500 uppercase tracking-widest font-bold'>Automated session reporting and predictive planning for subsequent actions.</p>
        </div>
      </div>
    </div>
  );
};

export default IntelligenceCore;
