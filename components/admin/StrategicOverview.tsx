'use client';

import React from 'react';
import { 
  FaUser, FaShieldAlt, FaProjectDiagram, FaBrain
} from 'react-icons/fa';
import SunsetPulseOverride from './SunsetPulseOverride';
import JamieSprintGenerator from '@/components/JamieSprintGenerator';

interface StrategicOverviewProps {
  agent: any;
  leadsCount: number;
  residentialCount: number;
  rvCount: number;
  onShowPipeline: () => void;
  onSprintCreated: (id: string) => void;
}

const StrategicOverview: React.FC<StrategicOverviewProps> = ({ 
  agent, 
  leadsCount, 
  residentialCount, 
  rvCount, 
  onShowPipeline,
  onSprintCreated
}) => {
  return (
    <div className='p-8 border-r border-b border-white/5 bg-[var(--tl-bg)] text-[var(--tl-color)] transition-all duration-500 overflow-y-auto'>
      <header className='mb-8 flex justify-between items-start'>
        <div className='flex gap-4 items-start'>
          {agent && (
            <div className='relative'>
              <div className='w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 overflow-hidden flex items-center justify-center'>
                {agent.avatar_url ? <img src={agent.avatar_url} alt='' className='w-full h-full object-cover' /> : <FaUser className='text-blue-400' />}
              </div>
              {agent.role === 'realtor' && (
                <div className='absolute -right-2 -bottom-2 bg-green-500 text-black p-1 rounded-md shadow-lg' title='Verified Agent'>
                  <FaShieldAlt size={10} />
                </div>
              )}
            </div>
          )}
          <div>
            <h1 className='text-4xl font-black tracking-tighter uppercase italic text-blue-500'>
              Management Console
            </h1>
            <div className='flex items-center gap-2 mt-1'>
              <p className='opacity-50 font-mono text-[10px] uppercase tracking-widest'>[ {agent?.full_name || 'LOADING...'} ]</p>
              {agent?.role === 'realtor' && (
                <span className='text-[7px] font-black bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded border border-green-500/20 uppercase'>Verified</span>
              )}
            </div>
          </div>
        </div>
        <div className='flex gap-2'>
          <button 
            onClick={onShowPipeline}
            className='bg-blue-600 hover:bg-blue-500 text-white px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20'
          >
            <FaProjectDiagram size={12} /> Pipeline Grid
          </button>
          <div className='bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg'>
            <div className='text-[8px] font-black uppercase text-blue-400'>Residential</div>
            <div className='text-lg font-mono font-bold'>{residentialCount}</div>
          </div>
          <div className='bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-lg'>
            <div className='text-[8px] font-black uppercase text-green-400'>RV Assets</div>
            <div className='text-lg font-mono font-bold'>{rvCount}</div>
          </div>
        </div>
      </header>
      
      <div className='bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10'>
        <div className='flex justify-between items-center mb-4'>
          <div className='text-xs uppercase tracking-widest opacity-50 font-bold'>Total Leads Captured</div>
        </div>
        <div className='text-6xl font-mono'>{leadsCount}</div>
      </div>

      <div className='mt-8 space-y-6'>
        <SunsetPulseOverride primaryColor="blue" />
        <JamieSprintGenerator onSprintCreated={onSprintCreated} />
      </div>

      <div className='mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 backdrop-blur-sm relative overflow-hidden group hover:border-blue-500/30 transition-all'>
        <div className='absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform'>
          <FaBrain size={40} className='text-blue-400' />
        </div>
        <p className='text-[9px] font-mono leading-relaxed text-blue-300/80 uppercase tracking-wider italic'>
          <span className='text-blue-400 font-black'>[ SYSTEM_UPDATE ]</span> : Jamie is analyzing the DNA of current market requests to eliminate search fatigue across the grid.
        </p>
      </div>
    </div>
  );
};

export default StrategicOverview;
