'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeProvider';
import { Shield, Zap } from 'lucide-react';

const AdvancedModeIndicator = () => {
  const { isAdvancedMode } = useTheme();

  if (!isAdvancedMode) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none">
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/90 text-white rounded-full border border-primary/50 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap size={14} className="text-primary fill-primary" />
          <span className="text-xs font-bold tracking-widest uppercase">Advanced Mode</span>
        </div>
      </div>
    </div>
  );
};

export default AdvancedModeIndicator;
