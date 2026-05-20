'use client';

import React, { useState } from 'react';
import { FaCog, FaDatabase, FaShieldAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';

const ValuationAdminPanel = () => {
  const [mockMode, setMockMode] = useState(false);
  const [bypassLimits, setBypassLimits] = useState(true);

  const handleUpdateConfig = () => {
    toast.success('Valuation parameters updated locally.');
  };

  return (
    <div className='max-w-5xl mx-auto mb-12 bg-blue-600/5 border border-blue-500/20 rounded-[2rem] p-8 no-print'>
      <div className='flex items-center justify-between mb-8'>
        <div className='flex items-center gap-3'>
          <div className='p-3 bg-blue-600/20 rounded-xl text-blue-400'>
            <FaCog size={20} />
          </div>
          <div>
            <h3 className='text-lg font-black uppercase tracking-tight text-white'>Valuation Control Panel</h3>
            <p className='text-[10px] text-blue-400/60 uppercase font-bold tracking-widest'>Admin Level Access: Restricted</p>
          </div>
        </div>
        <div className='flex items-center gap-2 bg-blue-600/20 px-4 py-2 rounded-xl border border-blue-500/20'>
          <FaShieldAlt className='text-blue-400' size={14} />
          <span className='text-[10px] font-black uppercase tracking-widest text-blue-400'>Authorized: tahsrz@gmail.com</span>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        <div className='p-6 bg-black/40 rounded-2xl border border-white/5 space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h4 className='text-sm font-bold text-white'>Valuation Mock Mode</h4>
              <p className='text-[10px] text-slate-500 mt-1'>Use synthetic data for architectural testing.</p>
            </div>
            <button 
              onClick={() => setMockMode(!mockMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${mockMode ? 'bg-blue-600' : 'bg-white/10'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all ${mockMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className='p-6 bg-black/40 rounded-2xl border border-white/5 space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h4 className='text-sm font-bold text-white'>Bypass Rate Limits</h4>
              <p className='text-[10px] text-slate-500 mt-1'>Disable API throttling for rapid testing.</p>
            </div>
            <button 
              onClick={() => setBypassLimits(!bypassLimits)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${bypassLimits ? 'bg-blue-600' : 'bg-white/10'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all ${bypassLimits ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className='mt-8 flex justify-end'>
        <button 
          onClick={handleUpdateConfig}
          className='px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all'
        >
          Apply Configuration
        </button>
      </div>
    </div>
  );
};

export default ValuationAdminPanel;
