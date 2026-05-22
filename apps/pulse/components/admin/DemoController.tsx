'use client';

import React, { useState } from 'react';
import { toast } from 'react-toastify';

interface DemoControllerProps {
  onRefreshLeads: () => void;
}

const DemoController: React.FC<DemoControllerProps> = ({ onRefreshLeads }) => {
  const [demoLocation, setDemoLocation] = useState<string>('Decatur');
  const [demoChange, setDemoChange] = useState<string>('+18%');

  const triggerDemo = async (action: 'seed' | 'anomaly') => {
    const id = toast.loading(`Executing ${action.toUpperCase()} process...`);
    try {
      const body: { action: string; location?: string; change?: string } = { action };
      if (action === 'anomaly') {
        body.location = demoLocation;
        body.change = demoChange;
      }

      const res = await fetch('/api/demo/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        toast.update(id, { render: `${action.toUpperCase()} SUCCESS`, type: "success", isLoading: false, autoClose: 3000 });
        setTimeout(onRefreshLeads, 2000);
      }
    } catch (error) {
      toast.update(id, { render: "PROCESS FAILED", type: "error", isLoading: false, autoClose: 3000 });
    }
  };

  return (
    <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 bg-black/80 backdrop-blur-3xl p-4 rounded-3xl border border-white/10 shadow-2xl scale-90 hover:scale-100 transition-all group'>
      <div className='flex items-center gap-3 mb-2 px-1'>
        <div className='flex flex-col'>
          <span className='text-[7px] font-black text-slate-500 uppercase tracking-widest'>Target Location</span>
          <input 
            type="text" 
            value={demoLocation}
            onChange={(e) => setDemoLocation(e.target.value)}
            className='bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[10px] font-bold focus:outline-none focus:border-blue-500 transition-all w-24'
            placeholder="e.g. Decatur"
          />
        </div>
        <div className='flex flex-col'>
          <span className='text-[7px] font-black text-slate-500 uppercase tracking-widest'>Delta %</span>
          <input 
            type="text" 
            value={demoChange}
            onChange={(e) => setDemoChange(e.target.value)}
            className='bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[10px] font-bold focus:outline-none focus:border-blue-500 transition-all w-16'
            placeholder="+10%"
          />
        </div>
      </div>
      
      <div className='flex gap-2'>
        <button 
          onClick={() => triggerDemo('seed')}
          className='flex-grow px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all'
        >
          Sync Data
        </button>
        <button 
          onClick={() => triggerDemo('anomaly')}
          className='flex-grow px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-400 transition-all shadow-lg shadow-blue-900/40'
        >
          Trigger Anomaly
        </button>
      </div>
    </div>
  );
};

export default DemoController;
