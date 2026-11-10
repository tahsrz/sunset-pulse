'use client';

import React from 'react';
import styles from '@/app/home.module.css';

export type StageMode = 'STAGED' | 'LIVE';

interface StageSwitcherProps {
  mode: StageMode;
  onModeChange: (mode: StageMode) => void;
  liveStatus?: string;
}

const StageSwitcher: React.FC<StageSwitcherProps> = ({ mode, onModeChange, liveStatus = 'Explore current listings' }) => {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={mode === 'STAGED'}
          onClick={() => onModeChange('STAGED')}
          className={`${styles.action} ${mode === 'STAGED' ? styles.primary : ''}`}
        >
          <span>Curated Listings</span>
        </button>
        <button
          type="button"
          aria-pressed={mode === 'LIVE'}
          onClick={() => onModeChange('LIVE')}
          className={`${styles.action} ${mode === 'LIVE' ? styles.primary : ''}`}
        >
          <span>Live MLS Feed</span>
        </button>
      </div>
      
      <div className="mt-3" role="status">
        <span className="text-xs leading-5 text-slate-300">
          {mode === 'STAGED' 
            ? 'Showing selected properties'
            : liveStatus}
        </span>
      </div>
    </div>
  );
};

export default StageSwitcher;
