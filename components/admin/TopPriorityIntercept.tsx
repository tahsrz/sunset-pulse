'use client';

import React from 'react';
import { 
  FaExclamationCircle, FaRv, FaBuilding, FaEnvelope, FaPhone, FaBolt, FaUndo 
} from 'react-icons/fa';

interface TopPriorityInterceptProps {
  topPriority: any;
  onReengage: (id: string) => void;
}

const TopPriorityIntercept: React.FC<TopPriorityInterceptProps> = ({ topPriority, onReengage }) => {
  if (!topPriority || !topPriority.name) return null;

  return (
    <div className='p-8 border-b border-white/5 bg-[var(--tr-bg)] text-[var(--tr-color)] transition-all duration-500 overflow-y-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-2'>
          <FaExclamationCircle className='text-blue-500' />
          <h2 className='text-xs font-black uppercase tracking-widest opacity-50'>Top Priority Lead</h2>
        </div>
        <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1 ${topPriority.leadCategory === 'RV' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
          {topPriority.leadCategory === 'RV' ? <FaRv size={8} /> : <FaBuilding size={8} />}
          {topPriority.leadCategory}
        </span>
      </div>

      <div className='space-y-4'>
        <div className='flex justify-between items-start'>
          <div>
            <h3 className='text-3xl font-black leading-tight'>{topPriority.name}</h3>
            <div className='flex gap-4 opacity-70 mt-2'>
              <span className='flex items-center gap-2 text-xs'><FaEnvelope size={10} /> {topPriority.email}</span>
              <span className='flex items-center gap-2 text-xs'><FaPhone size={10} /> {topPriority.phone}</span>
            </div>
          </div>
          <div className='text-right'>
            <div className='text-[10px] uppercase font-bold opacity-50 mb-1'>Velocity</div>
            <div className='text-2xl font-black text-blue-500 flex items-center gap-1 justify-end'><FaBolt size={14} /> {topPriority.engagementVelocity || 0}</div>
          </div>
        </div>
        
        <div className='bg-blue-600 text-white p-4 rounded-xl shadow-lg relative overflow-hidden'>
          <div className='absolute -right-4 -bottom-4 opacity-10 rotate-12'><FaBolt size={80} /></div>
          <p className='text-sm italic font-serif relative z-10'>"{topPriority.jamieNotes}"</p>
        </div>

        {topPriority.reengagementHook && (
          <div className='bg-white/10 border border-white/20 p-4 rounded-xl'>
            <div className='text-[10px] uppercase font-bold opacity-50 mb-2 flex items-center gap-2'><FaUndo size={8} /> Active Reactivation Hook</div>
            <p className='text-xs font-mono text-blue-400'>{topPriority.reengagementHook}</p>
          </div>
        )}

        <div className='flex justify-between items-end pt-2'>
          <div>
            <div className='text-[10px] uppercase font-bold opacity-50 mb-1'>Closing Probability</div>
            <div className='text-4xl font-black text-green-400'>{topPriority.probability}%</div>
          </div>
          {topPriority.probability < 60 && (
            <button 
              onClick={() => onReengage(topPriority._id)}
              className='bg-white/10 hover:bg-white/20 text-white text-[10px] px-4 py-2 rounded-lg font-bold uppercase transition-all flex items-center gap-2'
            >
              <FaUndo /> Trigger Re-engagement
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopPriorityIntercept;
