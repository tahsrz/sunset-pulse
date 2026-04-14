'use client';

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Lead } from '@/lib/types';
import { FaBolt, FaSync } from 'react-icons/fa';

interface EngagementTriggerGridProps {
  lead: Lead;
  onRefreshSuccess?: () => void;
}

const EngagementTriggerGrid: React.FC<EngagementTriggerGridProps> = ({ lead, onRefreshSuccess }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const protocols = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/leads/reengage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead._id })
      });
      if (res.ok) {
        toast.success("Engagement Channels Re-synced.");
        if (onRefreshSuccess) onRefreshSuccess();
      } else {
        toast.error("Channel sync failed.");
      }
    } catch (error) {
      toast.error("Signal lost during re-engagement.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const sendHook = (type: string) => {
    const hook = lead.reengagementHook?.[type.toLowerCase()];
    if (hook) {
      toast.success(`Channel ${type} Active: ${hook}`);
      // this would trigger an API call to send SMS/Email
    } else {
      toast.error(`Channel ${type} Unavailable for this lead.`);
    }
  };

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <div className='text-[9px] font-black uppercase text-slate-500 tracking-widest'>Engagement Channels</div>
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className='text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-tighter flex items-center gap-1 transition-all disabled:opacity-50'
        >
          <FaBolt className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Syncing...' : 'Refresh Channels'}
        </button>
      </div>

      <div className='flex flex-wrap gap-1 max-w-[240px]'>
        {protocols.map(char => {
          const hookContent = lead.reengagementHook?.[char.toLowerCase()];
          const isActive = !!hookContent;
          return (
            <button
              key={char}
              onClick={() => sendHook(char)}
              className={`w-7 h-7 flex items-center justify-center text-[9px] font-black rounded border transition-all ${
                isActive 
                  ? 'bg-blue-600 border-blue-400 text-white hover:bg-blue-500 hover:scale-110 shadow-lg shadow-blue-900/20' 
                  : 'bg-white/5 border-white/10 text-white/20 cursor-not-allowed'
              }`}
              title={isActive ? `Channel ${char}: ${hookContent}` : `Channel ${char} Unavailable`}
              disabled={!isActive || isRefreshing}
            >
              {char}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default EngagementTriggerGrid;
