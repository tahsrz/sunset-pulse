'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { VIBE_THEMES, resolveVibeFromContent } from '@/lib/visualization/vibe_themes';

interface VibeContextType {
  currentVibe: string;
  setVibeFromContent: (content: string) => void;
  vibeTheme: any;
}

const VibeContext = createContext<VibeContextType | undefined>(undefined);

export const VibeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentVibe, setCurrentVibe] = useState('default');
  const [vibeTheme, setVibeTheme] = useState<any>(null);

  const setVibeFromContent = (content: string) => {
    const vibe = resolveVibeFromContent(content);
    setCurrentVibe(vibe);
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
    <VibeContext.Provider value={{ currentVibe, setVibeFromContent, vibeTheme }}>
      <div className={`vibe-simulacrum-root transition-all duration-1000 ${currentVibe}`}>
        {children}

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

        {vibeTheme?.features.includes('GOLDEN_TICKER') && (
          <div className="fixed bottom-0 left-0 w-full h-8 bg-black/90 border-t border-[var(--accent-color)] text-[var(--accent-color)] flex items-center overflow-hidden z-[100] font-mono text-[10px] uppercase shadow-[0_-4px_12px_rgba(234,179,8,0.2)]">
            <div className="animate-marquee whitespace-nowrap">
              INSTITUTIONAL_ALPHA... PORTFOLIO_YIELD: +14.2% ... EQUITY_MAXIMA: REACHED ... STRATEGIC_ACQUISITION_READY ... SUNSET_PULSE_TRUSTED_PARTNER ...
            </div>
          </div>
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
