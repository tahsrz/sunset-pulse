'use client';

import React from 'react';
import { FaHome, FaCheckCircle } from 'react-icons/fa';
import JamieSprintDashboard from '@/components/JamieSprintDashboard';
import IntelligenceTimeline from '@/components/IntelligenceTimeline';
import LeadGroupGrid from './intelligence/LeadGroupGrid';
import ValuationGrid from './intelligence/ValuationGrid';
import InsightGrid from './intelligence/InsightGrid';
import ActivityGrid from './intelligence/ActivityGrid';

interface DataInsightsGridProps {
  bottomLeftMode: string;
  setBottomLeftMode: (mode: string) => void;
  groupedLeads: any;
  valuations: any[];
  insights: any[];
  bookings: any[];
  activeSprintId: string | null;
}

const DataInsightsGrid: React.FC<DataInsightsGridProps> = ({
  bottomLeftMode,
  setBottomLeftMode,
  groupedLeads,
  valuations,
  insights,
  bookings,
  activeSprintId
}) => {
  return (
    <div className='p-8 border-r border-white/5 bg-[var(--bl-bg)] text-[var(--bl-color)] transition-all duration-500 overflow-y-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-2'>
          {bottomLeftMode === 'clusters' ? <FaHome className='opacity-50' /> : <FaCheckCircle className='opacity-50' />}
          <h2 className='text-xs font-black uppercase tracking-widest opacity-50'>
            {bottomLeftMode === 'clusters' ? 'Lead Groups' : 'Activity Feed'}
          </h2>
        </div>
        <div className='flex bg-white/5 p-1 rounded-lg border border-white/10'>
          {['clusters', 'valuations', 'insights', 'jamie-sprints', 'timeline', 'activity'].map((mode) => (
            <button 
              key={mode}
              onClick={() => setBottomLeftMode(mode)} 
              className={`text-[8px] px-2 py-1 rounded font-black transition-all uppercase ${bottomLeftMode === mode ? 'bg-blue-600 text-white' : 'text-white/30 hover:text-white/60'}`}
            >
              {mode === 'jamie-sprints' ? 'Jamie Sprints' : mode}
            </button>
          ))}
        </div>
      </div>
      
      <div className='space-y-6 h-full'>
        {bottomLeftMode === 'clusters' ? (
          <LeadGroupGrid groupedLeads={groupedLeads} />
        ) : bottomLeftMode === 'valuations' ? (
          <ValuationGrid valuations={valuations} />
        ) : bottomLeftMode === 'insights' ? (
          <InsightGrid insights={insights} />
        ) : bottomLeftMode === 'jamie-sprints' || bottomLeftMode === 'sprints' ? (
          <JamieSprintDashboard activeSprintId={activeSprintId} />
        ) : bottomLeftMode === 'timeline' ? (
          <IntelligenceTimeline />
        ) : (
          <ActivityGrid bookings={bookings} />
        )}
      </div>
    </div>
  );
};

export default DataInsightsGrid;
