'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface QuadrantStyle {
  background: string;
  color: string;
}

interface Branding {
  primaryColor: string;
  fontFamily: string;
  borderRadius: string;
  // Modular UI Regions
  navBackground?: string;
  mainBackground?: string;
  // Quadrant Targeting
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
  // Deep merge initial with defaults
  const [branding, setBranding] = useState<Branding>(() => {
    const base = { ...defaultBranding, ...initialBranding };
    base.quadrants = { ...defaultBranding.quadrants, ...initialBranding?.quadrants };
    return base;
  });
  
  const [stagedBranding, setStagedBranding] = useState<Branding | null>(null);
  const [isDevMode, setDevModeState] = useState(false);

  // Persistence for Dev Mode
  useEffect(() => {
    const saved = localStorage.getItem('jamie_dev_mode');
    if (saved === 'true') {
      setDevModeState(true);
      console.log('⚡ [JAMIE_DEV_MODE] Intelligence Grid Synchronized. Protocol V4.2.0 Active.');
    }
  }, []);

  const setDevMode = (active: boolean) => {
    setDevModeState(active);
    localStorage.setItem('jamie_dev_mode', active ? 'true' : 'false');
    if (active) {
      console.log('⚡ [JAMIE_DEV_MODE] Active. UI Manipulation Protocol Enabled.');
    } else {
      console.log('🔒 [JAMIE_DEV_MODE] Inactive. Intelligence Grid Secured.');
    }
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
      
      // Inject Quadrant Variables
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
      setDevMode 
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
