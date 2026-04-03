'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { ABIDAN_DATA, AbidanCharacter } from '@/constants/abidan';
import { toast } from 'react-toastify';

interface QuadrantStyle {
  background: string;
  color: string;
}

interface Branding {
  primaryColor: string;
  fontFamily: string;
  borderRadius: string;
  navBackground?: string;
  mainBackground?: string;
  quadrants: {
    topLeft: QuadrantStyle;
    topRight: QuadrantStyle;
    bottomLeft: QuadrantStyle;
    bottomRight: QuadrantStyle;
  }
}

interface ThemeContextType {
  branding: Branding;
  stagedBranding: Branding | null;
  updateBranding: (newSettings: any) => void;
  stageBranding: (newSettings: any) => void;
  confirmBranding: () => void;
  cancelStaging: () => void;
  isDevMode: boolean;
  setDevMode: (active: boolean) => void;
  selectedAbidan: AbidanCharacter;
  setSelectedAbidan: (abidan: AbidanCharacter) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const defaultBranding: Branding = {
  primaryColor: '#2563eb',
  fontFamily: 'Inter',
  borderRadius: '8px',
  navBackground: '#1d4ed8',
  mainBackground: '#f8fafc',
  quadrants: {
    topLeft: { background: 'transparent', color: 'inherit' },
    topRight: { background: 'transparent', color: 'inherit' },
    bottomLeft: { background: 'transparent', color: 'inherit' },
    bottomRight: { background: 'transparent', color: 'inherit' },
  }
};

export function ThemeProvider({ 
  children, 
  branding: initialBranding 
}: { 
  children: ReactNode; 
  branding: Branding; 
}) {
  const { data: session } = useSession();
  const [branding, setBranding] = useState<Branding>(() => {
    const base = { ...defaultBranding, ...initialBranding };
    base.quadrants = { ...defaultBranding.quadrants, ...initialBranding?.quadrants };
    return base;
  });
  
  const [stagedBranding, setStagedBranding] = useState<Branding | null>(null);
  const [isDevMode, setDevModeState] = useState(false);
  const [selectedAbidan, setSelectedAbidanState] = useState<AbidanCharacter>(ABIDAN_DATA[0]);

  useEffect(() => {
    const savedDev = localStorage.getItem('jamie_dev_mode');
    
    // Check if user is still subscribed before restoring dev mode
    if (savedDev === 'true') {
      if (session?.user?.isSubscribed) {
        setDevModeState(true);
      } else {
        localStorage.removeItem('jamie_dev_mode');
        setDevModeState(false);
      }
    }

    const savedAbidanId = localStorage.getItem('selected_abidan');
    if (savedAbidanId) {
      const found = ABIDAN_DATA.find(a => a.id === savedAbidanId);
      if (found) setSelectedAbidanState(found);
    }
  }, [session]);

  const setSelectedAbidan = (abidan: AbidanCharacter) => {
    setSelectedAbidanState(abidan);
    localStorage.setItem('selected_abidan', abidan.id);
    console.log(`🛡️ [ABIDAN_CORE] Mantle assumed: ${abidan.name} (${abidan.mantle})`);
  };

  const setDevMode = (active: boolean) => {
    if (active && !session?.user?.isSubscribed) {
      toast.error('Subscription required for Dev Mode access.');
      console.warn('🔒 [JAMIE_SECURITY] Dev Mode access denied. Active subscription not found.');
      return;
    }
    setDevModeState(active);
    localStorage.setItem('jamie_dev_mode', active ? 'true' : 'false');
  };

  const updateBranding = (newSettings: any) => {
    setBranding((prev) => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.quadrants) {
        updated.quadrants = { ...prev.quadrants, ...newSettings.quadrants };
      }
      return updated;
    });
    setStagedBranding(null);
  };

  const stageBranding = (newSettings: any) => {
    setStagedBranding((prev) => {
      const base = prev || branding;
      const updated = { ...base, ...newSettings };
      if (newSettings.quadrants) {
        updated.quadrants = { ...base.quadrants, ...newSettings.quadrants };
      }
      return updated;
    });
  };

  const confirmBranding = () => {
    if (stagedBranding) {
      setBranding(stagedBranding);
      setStagedBranding(null);
    }
  };

  const cancelStaging = () => {
    setStagedBranding(null);
  };

  useEffect(() => {
    const target = stagedBranding || branding;
    if (target) {
      const root = document.documentElement;
      root.style.setProperty('--primary-color', target.primaryColor);
      root.style.setProperty('--font-family', target.fontFamily);
      root.style.setProperty('--border-radius', target.borderRadius);
      root.style.setProperty('--nav-bg', target.navBackground || '');
      root.style.setProperty('--main-bg', target.mainBackground || '');
      
      root.style.setProperty('--tl-bg', target.quadrants.topLeft.background);
      root.style.setProperty('--tr-bg', target.quadrants.topRight.background);
      root.style.setProperty('--bl-bg', target.quadrants.bottomLeft.background);
      root.style.setProperty('--br-bg', target.quadrants.bottomRight.background);
      
      root.style.setProperty('--tl-color', target.quadrants.topLeft.color);
      root.style.setProperty('--tr-color', target.quadrants.topRight.color);
      root.style.setProperty('--bl-color', target.quadrants.bottomLeft.color);
      root.style.setProperty('--br-color', target.quadrants.bottomRight.color);
    }
  }, [branding, stagedBranding]);

  return (
    <ThemeContext.Provider value={{ 
      branding, 
      stagedBranding, 
      updateBranding, 
      stageBranding, 
      confirmBranding, 
      cancelStaging, 
      isDevMode, 
      setDevMode,
      selectedAbidan,
      setSelectedAbidan
    }}>
      <div 
        style={{ 
          '--primary-color': (stagedBranding || branding)?.primaryColor,
          fontFamily: (stagedBranding || branding)?.fontFamily 
        } as React.CSSProperties}
        className="min-h-screen transition-all duration-500 bg-[var(--main-bg)]"
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
