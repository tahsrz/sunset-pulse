'use client';

import React, { useState } from 'react';
import { FaBolt, FaBrain } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface SunsetPulseOverrideProps {
  primaryColor: string;
}

const SunsetPulseOverride: React.FC<SunsetPulseOverrideProps> = ({ primaryColor }) => {
  const [interestInput, setInterestInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const syncInterests = async () => {
    if (!interestInput.trim()) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/user/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests: interestInput })
      });
      if(res.ok) {
        toast.success("JAMIE_GRID: Intelligence Synchronized.");
        setInterestInput('');
      }
    } catch (error) {
      toast.error("Failed to sync intelligence grid.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className='bg-black/40 border border-white/10 p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all'>
      <div className='absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity' />
      <div className='relative z-10'>
        <div className='flex items-center gap-2 mb-4'>
          <FaBolt className='text-blue-400 animate-pulse' />
          <h2 className='text-xs font-black uppercase tracking-[0.2em] text-white'>Sunset Pulse Override</h2>
        </div>
        <textarea
          value={interestInput}
          onChange={(e) => setInterestInput(e.target.value)}
          placeholder="Inject new strategic interests into Jamie's spatial dream engine..."
          className='w-full bg-slate-950/50 border border-white/10 rounded-xl p-4 text-xs font-mono text-blue-400 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all resize-none h-24 mb-4'
        />
        <button
          onClick={syncInterests}
          disabled={isSyncing}
          className='w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50'
        >
          {isSyncing ? 'Synchronizing...' : 'Sync Intel Grid'}
        </button>
      </div>
    </div>
  );
};

export default SunsetPulseOverride;
