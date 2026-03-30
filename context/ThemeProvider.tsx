'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Branding {
  primaryColor: string;
  secondaryColor?: string;
  fontFamily: string;
  borderRadius: string;
  navStyle?: string;
}

interface ThemeContextType {
  branding: Branding;
  updateBranding: (newSettings: Partial<Branding>) => void;
  isDevMode: boolean;
  setDevMode: (active: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const defaultBranding: Branding = {
  primaryColor: '#2563eb',
  fontFamily: 'Inter',
  borderRadius: '8px'
};

export function ThemeProvider({ 
  children, 
  branding: initialBranding 
}: { 
  children: ReactNode; 
  branding: Branding; 
}) {
  const [branding, setBranding] = useState<Branding>(initialBranding || defaultBranding);
  const [isDevMode, setDevMode] = useState(false);

  const updateBranding = (newSettings: Partial<Branding>) => {
    setBranding((prev) => ({
      ...prev,
      ...newSettings,
    }));
  };

  useEffect(() => {
    if (branding) {
      const root = document.documentElement;
      root.style.setProperty('--primary-color', branding.primaryColor);
      root.style.setProperty('--font-family', branding.fontFamily);
      root.style.setProperty('--border-radius', branding.borderRadius);
    }
  }, [branding]);

  return (
    <ThemeContext.Provider value={{ branding, updateBranding, isDevMode, setDevMode }}>
      <div 
        style={{ 
          '--primary-color': branding?.primaryColor || defaultBranding.primaryColor,
          fontFamily: branding?.fontFamily || defaultBranding.fontFamily 
        } as React.CSSProperties}
        className="min-h-screen transition-all duration-500"
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
