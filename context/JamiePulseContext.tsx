'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { JamieBriefing, normalizeJamieBriefing } from '@/lib/types/jamieBriefing';

interface JamiePulseContextType {
  latestBriefing: JamieBriefing | null;
  showOverlay: boolean;
  setShowOverlay: (show: boolean) => void;
  triggerPulse: (briefing: JamieBriefing) => void;
}

const JamiePulseContext = createContext<JamiePulseContextType | undefined>(undefined);

export function JamiePulseProvider({ children }: { children: ReactNode }) {
  const [latestBriefing, setLatestBriefing] = useState<JamieBriefing | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  const triggerPulse = (briefing: JamieBriefing) => {
    setLatestBriefing(briefing);
    setShowOverlay(true);
    
    // Auto-hide after some time if needed, or let user dismiss
    // For a hero overlay, we likely want the user to dismiss it or have a long duration
  };

  useEffect(() => {
    // Listen for new briefings in Supabase
    const channel = supabase
      .channel('public:daily_briefings')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'daily_briefings' 
      }, (payload) => {
        console.log('🌟 [JAMIE_PULSE] New briefing detected:', payload.new);
        const briefing = normalizeJamieBriefing(payload.new);
        if (briefing) {
          triggerPulse(briefing);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <JamiePulseContext.Provider value={{ 
      latestBriefing, 
      showOverlay, 
      setShowOverlay,
      triggerPulse 
    }}>
      {children}
    </JamiePulseContext.Provider>
  );
}

export const useJamiePulse = () => {
  const context = useContext(JamiePulseContext);
  if (!context) throw new Error('useJamiePulse must be used within a JamiePulseProvider');
  return context;
};
