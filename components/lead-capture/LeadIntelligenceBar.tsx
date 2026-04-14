'use client';

import React from 'react';

interface LeadIntelligenceBarProps {
  probability: number;
}

const LeadIntelligenceBar: React.FC<LeadIntelligenceBarProps> = ({ probability }) => {
  return (
    <div className='space-y-2'>
      <div className='flex justify-between items-end'>
        <label className='block text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1'>Intel Probability</label>
        <span className='text-[10px] font-mono font-bold text-blue-400'>{probability}%</span>
      </div>
      <div className='h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5'>
        <div 
          className='h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
          style={{ width: `${probability}%` }}
        />
      </div>
    </div>
  );
};

export default LeadIntelligenceBar;
