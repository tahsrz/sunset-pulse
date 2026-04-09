'use client';

import React from 'react';
import { FaCheckCircle, FaFilePdf } from 'react-icons/fa';

interface ValuationResultProps {
  result: {
    address: string;
    estimate: number;
    features?: string[];
  };
  confirmed: boolean;
  onConfirm: () => void;
  onDownload: () => void;
  onReset: () => void;
}

const ValuationResult: React.FC<ValuationResultProps> = ({ result, confirmed, onConfirm, onDownload, onReset }) => {
  return (
    <div className='print-container max-w-5xl mx-auto bg-slate-900 border border-white/10 rounded-[3rem] p-12 animate-in zoom-in-95 duration-500 shadow-2xl relative'>
      {/* Print Only Header */}
      <div className='hidden print-header'>
        <h1 className='text-4xl font-black uppercase italic'>Sunset Pulse <span className='text-blue-600'>Property Report</span></h1>
        <p className='text-slate-500 text-xs font-bold uppercase tracking-widest mt-2'>Property Valuation Summary // Generated: {new Date().toLocaleDateString()}</p>
      </div>

      <div className='absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] no-print text-white shadow-xl shadow-blue-500/20'>Analysis Complete</div>
      
      <div className='mb-8 pb-8 border-b border-white/5'>
        <h2 className='text-xs font-bold text-blue-500 uppercase tracking-[0.3em] mb-2'>Property Address</h2>
        <p className='text-3xl font-black italic text-white'>{result.address}</p>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-12 text-left mb-12'>
        <div className='space-y-2'>
          <h3 className='text-[10px] font-bold uppercase text-slate-500 tracking-widest'>Estimated Value</h3>
          <div className='text-5xl font-black text-blue-500'>${result.estimate?.toLocaleString()}</div>
          <div className='text-[10px] font-mono text-green-400 font-bold uppercase'>Steady Market Growth Expected</div>
        </div>
        <div className='space-y-2'>
          <h3 className='text-[10px] font-bold uppercase text-slate-500 tracking-widest'>Market Viability</h3>
          <div className='text-4xl font-black uppercase italic text-white'>High Priority</div>
          <div className='text-[10px] font-mono text-blue-400 font-bold uppercase'>Strong Investment Potential</div>
        </div>
        <div className='space-y-2'>
          <h3 className='text-[10px] font-bold uppercase text-slate-500 tracking-widest'>Key Attributes</h3>
          <div className='flex flex-wrap gap-2 pt-2'>
            {result.features?.map((f, i) => (
              <span key={i} className='text-[8px] bg-white/5 border border-white/10 px-2 py-1 rounded font-bold uppercase tracking-widest text-white'>{f}</span>
            ))}
            {!result.features && (
               <span className='text-[8px] bg-white/5 border border-white/10 px-2 py-1 rounded font-bold uppercase tracking-widest text-white'>Standard Residential</span>
            )}
          </div>
        </div>
      </div>

      <div className='no-print flex flex-col md:flex-row gap-4 mt-12'>
        {!confirmed ? (
          <button 
            onClick={onConfirm}
            className='flex-1 bg-green-600 hover:bg-green-500 py-5 rounded-2xl font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg text-white'
          >
            <FaCheckCircle /> Save to Market Grid
          </button>
        ) : (
          <button 
            onClick={onDownload}
            className='flex-1 bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg text-white'
          >
            <FaFilePdf /> Export Property Report
          </button>
        )}
        <button 
          onClick={onReset}
          className='px-10 py-5 bg-white/5 hover:bg-white/10 rounded-2xl font-bold uppercase text-xs tracking-widest transition-all border border-white/10 text-white'
        >
          New Analysis
        </button>
      </div>

      {confirmed && (
        <div className='mt-8 p-6 bg-green-500/10 border border-green-500/20 rounded-3xl text-center no-print'>
          <p className='text-green-400 text-[10px] font-bold uppercase tracking-widest'>Market Intelligence Synchronized</p>
        </div>
      )}
    </div>
  );
};

export default ValuationResult;
