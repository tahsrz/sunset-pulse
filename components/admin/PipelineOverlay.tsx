'use client';

import React from 'react';
import LeadPipelineBoard from '@/components/LeadPipelineBoard';

interface PipelineOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const PipelineOverlay: React.FC<PipelineOverlayProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className='absolute inset-0 z-[100] bg-slate-950 p-8 overflow-y-auto animate-in fade-in zoom-in duration-300'>
      <div className='flex justify-between items-center mb-10'>
        <div>
          <h1 className='text-5xl font-black italic tracking-tighter text-blue-400'>Property Pipeline</h1>
          <p className='text-[10px] font-mono text-slate-500 uppercase tracking-[0.5em] mt-2'>System: Synchronized</p>
        </div>
        <button 
          onClick={onClose}
          className='bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95'
        >
          Close Pipeline
        </button>
      </div>
      <LeadPipelineBoard />
    </div>
  );
};

export default PipelineOverlay;
