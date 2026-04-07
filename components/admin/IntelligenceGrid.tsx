'use client';

import React from 'react';
import { FaHome, FaCheckCircle } from 'react-icons/fa';
import JamieSprintDashboard from '@/components/JamieSprintDashboard';
import IntelligenceTimeline from '@/components/IntelligenceTimeline';
import ClusterGrid from './intelligence/ClusterGrid';
import ReconGrid from './intelligence/ReconGrid';
import DreamGrid from './intelligence/DreamGrid';
import DeploymentGrid from './intelligence/DeploymentGrid';

interface IntelligenceGridProps {
  bottomLeftMode: string;
  setBottomLeftMode: (mode: string) => void;
  groupedLeads: any;
  valuations: any[];
  dreams: any[];
  bookings: any[];
  activeSprintId: string | null;
}

const IntelligenceGrid: React.FC<IntelligenceGridProps> = ({
  bottomLeftMode,
  setBottomLeftMode,
  groupedLeads,
  valuations,
  dreams,
  bookings,
  activeSprintId
}) => {
  return (
    <div className='p-8 border-r border-white/5 bg-[var(--bl-bg)] text-[var(--bl-color)] transition-all duration-500 overflow-y-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-2'>
          {bottomLeftMode === 'clusters' ? <FaHome className='opacity-50' /> : <FaCheckCircle className='opacity-50' />}
          <h2 className='text-xs font-black uppercase tracking-widest opacity-50'>
            {bottomLeftMode === 'clusters' ? 'Intelligence Clusters' : 'Operational Stream'}
          </h2>
        </div>
        <div className='flex bg-white/5 p-1 rounded-lg border border-white/10'>
          {['clusters', 'recon', 'dreams', 'sprints', 'timeline', 'deployments'].map((mode) => (
            <button 
              key={mode}
              onClick={() => setBottomLeftMode(mode)} 
              className={`text-[8px] px-2 py-1 rounded font-black transition-all uppercase ${bottomLeftMode === mode ? 'bg-blue-600 text-white' : 'text-white/30 hover:text-white/60'}`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
      
      <div className='space-y-6 h-full'>
        {bottomLeftMode === 'clusters' ? (
          <ClusterGrid groupedLeads={groupedLeads} />
        ) : bottomLeftMode === 'recon' ? (
          <ReconGrid valuations={valuations} />
        ) : bottomLeftMode === 'dreams' ? (
          <DreamGrid dreams={dreams} />
        ) : bottomLeftMode === 'sprints' ? (
          <JamieSprintDashboard activeSprintId={activeSprintId} />
        ) : bottomLeftMode === 'timeline' ? (
          <IntelligenceTimeline />
        ) : (
          <DeploymentGrid bookings={bookings} />
        )}
      </div>
    </div>
  );
};

export default IntelligenceGrid;
