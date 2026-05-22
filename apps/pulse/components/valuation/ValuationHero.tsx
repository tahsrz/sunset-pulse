'use client';

import React from 'react';
import { FaSearchLocation, FaChartLine } from 'react-icons/fa';

interface ValuationHeroProps {
  address: string;
  setAddress: (val: string) => void;
  onEstimate: (e: React.FormEvent) => void;
  loading: boolean;
}

const ValuationHero: React.FC<ValuationHeroProps> = ({ address, setAddress, onEstimate, loading }) => {
  return (
    <section className='relative py-32 overflow-hidden no-print'>
      <div className='container m-auto px-6 text-center relative z-10'>
        <div className='inline-flex items-center gap-2 bg-blue-500/10 text-blue-500 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.4em] mb-8 border border-blue-500/20'>
          <FaChartLine /> Real Estate Analysis
        </div>
        <h1 className='text-7xl font-black uppercase italic tracking-tighter mb-8 leading-none'>
          Analyze Your <span className='text-blue-500'>Market Position.</span>
        </h1>
        <p className='text-slate-500 max-w-2xl mx-auto mb-12 text-lg font-medium italic'>
          Enter your address to receive a detailed valuation based on historical trends, local development, and current market velocity.
        </p>
        
        <form onSubmit={onEstimate} className='max-w-2xl mx-auto relative group'>
          <div className='absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000'></div>
          <div className='relative flex items-center bg-slate-900 rounded-3xl p-2 border border-white/10'>
            <div className='pl-6 text-slate-500'>
              <FaSearchLocation size={20} />
            </div>
            <input 
              type='text' 
              placeholder='Enter property address...'
              className='flex-1 bg-transparent border-none focus:ring-0 px-6 py-4 text-sm font-bold uppercase tracking-widest placeholder:text-slate-700 text-white'
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <button 
              type='submit'
              disabled={loading}
              className='bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all flex items-center gap-2 shadow-xl shadow-blue-500/20 active:scale-95'
            >
              {loading ? 'Analyzing...' : 'Get Valuation'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default ValuationHero;
