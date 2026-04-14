'use client';

import React from 'react';
import { 
  FaExclamationCircle, FaBus, FaBuilding, FaEnvelope, FaPhone, FaBolt, FaUndo 
} from 'react-icons/fa';

import EngagementTriggerGrid from './EngagementTriggerGrid';

interface PriorityEngagementProps {
  topPriority: any;
  onRefreshLeads: () => void;
}

const PriorityEngagement: React.FC<PriorityEngagementProps> = ({ topPriority, onRefreshLeads }) => {
  if (!topPriority || !topPriority.name) return null;

  return (
    <div className='p-8 border-b border-white/5 bg-[var(--tr-bg)] text-[var(--tr-color)] transition-all duration-500 overflow-y-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-2'>
          <FaExclamationCircle className='text-blue-500' />
          <h2 className='text-xs font-black uppercase tracking-widest opacity-50'>Priority Engagement</h2>
        </div>
        <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1 ${topPriority.leadCategory === 'RV' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
          {topPriority.leadCategory === 'RV' ? <FaBus size={8} /> : <FaBuilding size={8} />}
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
            <div className='text-[10px] uppercase font-bold opacity-50 mb-1'>Engagement Velocity</div>
            <div className='text-2xl font-black text-blue-500 flex items-center gap-1 justify-end'><FaBolt size={14} /> {topPriority.engagementVelocity || 0}</div>
          </div>
        </div>
        
        <div className='bg-blue-600 text-white p-4 rounded-xl shadow-lg relative overflow-hidden'>
          <div className='absolute -right-4 -bottom-4 opacity-10 rotate-12'><FaBolt size={80} /></div>
          <p className='text-sm italic font-serif relative z-10'>"{topPriority.jamieNotes}"</p>
        </div>

        <div className='pt-2'>
          <EngagementTriggerGrid lead={topPriority} onRefreshSuccess={onRefreshLeads} />
        </div>

        <div className='flex justify-between items-end pt-4'>
          <div>
            <div className='text-[10px] uppercase font-bold opacity-50 mb-1'>Conversion Probability</div>
            <div className='text-4xl font-black text-green-400'>{topPriority.probability}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriorityEngagement;
