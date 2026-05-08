'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { VIBE_THEMES, resolveVibeFromContent } from '@/lib/visualization/vibe_themes';

interface VibeContextType {
  currentVibe: string;
  setVibeFromContent: (content: string) => void;
  vibeTheme: any;
  isChaosMode: boolean;
  toggleChaosMode: () => void;
  cycleVibe: () => void;
}

const VibeContext = createContext<VibeContextType | undefined>(undefined);

export const VibeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentVibe, setCurrentVibe] = useState('default');
  const [vibeTheme, setVibeTheme] = useState<any>(null);
  const [isChaosMode, setIsChaosMode] = useState(false);

  const setVibeFromContent = (content: string) => {
    if (isChaosMode) return; // Ignore AI cues in Chaos Mode
    const vibe = resolveVibeFromContent(content);
    setCurrentVibe(vibe);
  };

  const toggleChaosMode = () => setIsChaosMode(!isChaosMode);

  const cycleVibe = () => {
    const vibes = ['default', ...Object.keys(VIBE_THEMES)];
    const currentIndex = vibes.indexOf(currentVibe);
    const nextIndex = (currentIndex + 1) % vibes.length;
    setCurrentVibe(vibes[nextIndex]);
  };

  useEffect(() => {
    const theme = VIBE_THEMES[currentVibe];
    if (theme) {
      setVibeTheme(theme);
      // Apply CSS Variables to Document Root
      const root = document.documentElement;
      Object.entries(theme.variables).forEach(([key, value]) => {
        root.style.setProperty(key, value as string);
      });
    } else {
      // Reset to defaults if vibe not found
      setVibeTheme(null);
      // Optional: Clear CSS variables
    }
  }, [currentVibe]);

  return (
    <VibeContext.Provider value={{ currentVibe, setVibeFromContent, vibeTheme, isChaosMode, toggleChaosMode, cycleVibe }}>
      <div className={`vibe-simulacrum-root transition-all duration-1000 ${currentVibe}`}>
        {children}
        
        {/* Chaos Mode Control (Fixed Overlay for MVP) */}
        {process.env.NODE_ENV === 'development' || true && (
          <div className="fixed top-24 left-6 z-[200] pointer-events-auto">
            <button 
              onClick={toggleChaosMode}
              className={`p-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${isChaosMode ? 'bg-red-600 border-red-400 text-white' : 'bg-black/60 border-white/10 text-white/40'}`}
            >
              Chaos: {isChaosMode ? 'ON' : 'OFF'}
            </button>
            {isChaosMode && (
              <button 
                onClick={cycleVibe}
                className="ml-2 p-2 bg-blue-600 border border-blue-400 rounded-lg text-[10px] font-black uppercase text-white"
              >
                Cycle Vibe: {currentVibe}
              </button>
            )}
          </div>
        )}
        
        {/* Simulacrum Global Mocks */}
        {vibeTheme?.features.includes('METRIC_TICKER') && (
          <div className="fixed bottom-0 left-0 w-full h-8 bg-black/80 border-t border-[var(--primary-glow)] text-[var(--primary-glow)] flex items-center overflow-hidden z-[100] font-mono text-[10px] uppercase">
            <div className="animate-marquee whitespace-nowrap">
              OPTIMIZING_YIELD... ROI-MAXXING: 98.4% ... LATENCY-MINNING: 12ms ... LIQUIDITY-MAX: $4.2M ... SUNSET_PULSE_VERIFIED ...
            </div>
          </div>
        )}

        {vibeTheme?.features.includes('GLITCH_OVERLAY') && (
          <div className="fixed inset-0 pointer-events-none z-[99] opacity-[var(--bg-scanline-opacity)] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))]" />
        )}
      </div>
    </VibeContext.Provider>
  );
};

export const useVibe = () => {
  const context = useContext(VibeContext);
  if (!context) throw new Error('useVibe must be used within a VibeProvider');
  return context;
};
