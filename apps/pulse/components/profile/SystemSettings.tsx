'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeProvider';
import { FaBolt } from 'react-icons/fa';
import { JAMIE_VOICE_CHOICES, speak } from '@/lib/core/tts';

const SystemSettings = () => {
  const {
    isAdvancedMode, setAdvancedMode, customKeybind, setCustomKeybind,
    isWakeListeningEnabled, setWakeListeningEnabled,
    isGuardedJamieEnabled, setGuardedJamieEnabled,
    jamieVoice, setJamieVoice,
  } = useTheme();

  return (
    <div className='bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-xl'>
      <h3 className='text-xs font-bold uppercase tracking-[0.4em] text-white/40 mb-8 flex items-center gap-3'>
        <FaBolt className='text-blue-500' /> Application Settings
      </h3>
      
      <div className='space-y-8'>
        <div>
          <div className='flex items-center justify-between gap-6'>
            <div>
              <h4 className='text-sm font-bold text-white'>Jamie Character</h4>
              <p className='text-[10px] text-slate-500 mt-1 leading-relaxed'>Choose and preview Jamie&apos;s spoken voice.</p>
            </div>
            <span className='text-xs font-black text-emerald-300'>{jamieVoice}</span>
          </div>
          <div className='mt-3 grid grid-cols-2 gap-2'>
            {JAMIE_VOICE_CHOICES.map((voice) => (
              <button
                key={voice.id}
                type='button'
                onClick={() => { setJamieVoice(voice.id); speak('This is how I will sound.', voice.id); }}
                className={`border px-3 py-2 text-left text-xs font-bold transition ${jamieVoice === voice.id ? 'border-emerald-300 bg-emerald-300/10 text-emerald-200' : 'border-white/10 text-slate-400 hover:border-white/25 hover:text-white'}`}
              >
                {voice.label}
              </button>
            ))}
          </div>
        </div>

        <div className='flex items-center justify-between gap-6'>
          <div>
            <h4 className='text-sm font-bold text-white'>Voice Wake Listening</h4>
            <p className='text-[10px] text-slate-500 mt-1 leading-relaxed'>Keep a local 30-second transcript and send it only after you say &quot;Pull that up.&quot;</p>
          </div>
          <button aria-label='Toggle voice wake listening' aria-pressed={isWakeListeningEnabled} onClick={() => setWakeListeningEnabled(!isWakeListeningEnabled)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all ${isWakeListeningEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all shadow-lg ${isWakeListeningEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className='flex items-center justify-between gap-6 border-t border-white/5 pt-8'>
          <div>
            <h4 className='text-sm font-bold text-white'>Guarded Real Estate Mode</h4>
            <p className='text-[10px] text-slate-500 mt-1 leading-relaxed'>Apply the stricter listing-data and client-facing response contract.</p>
          </div>
          <button aria-label='Toggle guarded real estate mode' aria-pressed={isGuardedJamieEnabled} onClick={() => setGuardedJamieEnabled(!isGuardedJamieEnabled)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all ${isGuardedJamieEnabled ? 'bg-blue-600' : 'bg-white/10'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all shadow-lg ${isGuardedJamieEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

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
