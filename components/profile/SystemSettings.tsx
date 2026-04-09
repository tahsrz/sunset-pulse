'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeProvider';
import { FaBolt } from 'react-icons/fa';

const SystemSettings = () => {
  const { isAdvancedMode, setAdvancedMode, customKeybind, setCustomKeybind } = useTheme();

  return (
    <div className='bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-xl'>
      <h3 className='text-xs font-bold uppercase tracking-[0.4em] text-white/40 mb-8 flex items-center gap-3'>
        <FaBolt className='text-blue-500' /> Application Settings
      </h3>
      
      <div className='space-y-8'>
        <div className='flex items-center justify-between'>
          <div>
            <h4 className='text-sm font-bold text-white'>Analytics Mode</h4>
            <p className='text-[10px] text-slate-500 mt-1 leading-relaxed'>Enable detailed data visualization and insights.</p>
          </div>
          <button 
            onClick={() => setAdvancedMode(!isAdvancedMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${isAdvancedMode ? 'bg-blue-600' : 'bg-white/10'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all shadow-lg ${isAdvancedMode ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className='pt-8 border-t border-white/5'>
          <div className='flex items-center justify-between'>
            <div>
              <h4 className='text-sm font-bold text-white'>Activation Keybind</h4>
              <p className='text-[10px] text-slate-500 mt-1 leading-relaxed'>Custom shortcut for global action triggers.</p>
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-[9px] font-mono text-white/20 uppercase'>Shift +</span>
              <input 
                type='text' 
                maxLength={1}
                className='w-10 h-10 bg-black/40 text-center font-black border border-white/10 rounded-xl focus:border-blue-500 outline-none text-blue-400 transition-all uppercase'
                value={customKeybind}
                onChange={(e) => {
                  const val = e.target.value.slice(-1).toUpperCase();
                  if (val && /[A-Z0-9]/.test(val)) setCustomKeybind(val);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
