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
  updateBranding: (newSettings: any) => void;
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
  
  const [isDevMode, setDevMode] = useState(false);

  const updateBranding = (newSettings: any) => {
    setBranding((prev) => {
      // Recursive merge for quadrants
      const updated = { ...prev, ...newSettings };
      if (newSettings.quadrants) {
        updated.quadrants = { ...prev.quadrants, ...newSettings.quadrants };
      }
      return updated;
    });
  };

  useEffect(() => {
    if (branding) {
      const root = document.documentElement;
      root.style.setProperty('--primary-color', branding.primaryColor);
      root.style.setProperty('--font-family', branding.fontFamily);
      root.style.setProperty('--border-radius', branding.borderRadius);
      root.style.setProperty('--nav-bg', branding.navBackground || '');
      root.style.setProperty('--main-bg', branding.mainBackground || '');
      
      // Inject Quadrant Variables
      root.style.setProperty('--tl-bg', branding.quadrants.topLeft.background);
      root.style.setProperty('--tr-bg', branding.quadrants.topRight.background);
      root.style.setProperty('--bl-bg', branding.quadrants.bottomLeft.background);
      root.style.setProperty('--br-bg', branding.quadrants.bottomRight.background);
      
      root.style.setProperty('--tl-color', branding.quadrants.topLeft.color);
      root.style.setProperty('--tr-color', branding.quadrants.topRight.color);
      root.style.setProperty('--bl-color', branding.quadrants.bottomLeft.color);
      root.style.setProperty('--br-color', branding.quadrants.bottomRight.color);
    }
  }, [branding]);

  return (
    <ThemeContext.Provider value={{ branding, updateBranding, isDevMode, setDevMode }}>
      <div 
        style={{ 
          '--primary-color': branding?.primaryColor,
          fontFamily: branding?.fontFamily 
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
