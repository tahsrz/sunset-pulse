'use client';

import React, { useState } from 'react';
import { useIdentityFilter } from '@/hooks/useIdentityFilter';
import { FaUserShield, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

export default function IdentityTestPage() {
  const [username, setUsername] = useState('');
  const { checkAvailability, isLoading } = useIdentityFilter();

  const isAvailable = checkAvailability(username);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-[2.5rem] p-12 space-y-8 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <FaUserShield size={48} className="text-blue-500" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Identity <span className="text-blue-500">Purifier</span></h1>
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Neural Bloom Filter // Zero-Lookup Check</p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <input 
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Check username availability..."
              className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-sm font-mono focus:border-blue-500 outline-none transition-all"
            />
            {isLoading && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="bg-black/20 rounded-2xl p-6 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Status</span>
              {username ? (
                isAvailable ? (
                  <span className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase">
                    <FaCheckCircle /> Available
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-red-400 text-[10px] font-black uppercase">
                    <FaExclamationTriangle /> Taken (or Reserved)
                  </span>
                )
              ) : (
                <span className="text-slate-700 text-[10px] font-black uppercase">Awaiting Input</span>
              )}
            </div>

            <p className="text-[9px] font-mono text-slate-400 leading-relaxed italic">
              * This check is performed locally using a probabilistic neural hashmap. 
              Zero database packets were exchanged during this validation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
