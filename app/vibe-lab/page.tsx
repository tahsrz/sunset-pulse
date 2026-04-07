'use client';
import { useTheme } from '@/context/ThemeProvider';
import { FaFlask, FaCheck, FaTimes } from 'react-icons/fa';
import { VIBE_DICTIONARY } from '@/constants/vibes';
import VibeCard from '@/components/VibeCard';

export default function VibeLabPage() {
  const { stagedBranding, stageBranding, confirmBranding, cancelStaging } = useTheme();

  return (
    <div className="min-h-screen p-8 transition-all duration-500">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2 text-[var(--primary-color)]">
            <FaFlask size={32} />
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">Vibe Lab</h1>
          </div>
          <p className="opacity-50 font-mono text-sm">[ EXPERIMENTAL UI MANIPULATION GRID ]</p>
        </div>

        {stagedBranding && (
          <div className="flex gap-4 animate-in slide-in-from-right-4 duration-500">
            <button 
              onClick={cancelStaging}
              className="flex items-center gap-2 px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full font-black uppercase text-xs hover:bg-red-500 hover:text-white transition-all"
            >
              <FaTimes /> Revert Grid
            </button>
            <button 
              onClick={confirmBranding}
              className="flex items-center gap-2 px-8 py-3 bg-green-500 text-white rounded-full font-black uppercase text-xs shadow-xl shadow-green-500/20 hover:scale-105 transition-all"
            >
              <FaCheck /> Deploy Vibe
            </button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {Object.entries(VIBE_DICTIONARY).map(([name, config]) => (
          <VibeCard 
            key={name}
            name={name}
            config={config}
            isStaged={stagedBranding === config}
            onStage={stageBranding}
          />
        ))}
      </div>
    </div>
  );
}
