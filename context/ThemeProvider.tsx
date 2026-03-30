'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the shape of our branding for Type Safety
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
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ 
  children, 
  initialBranding 
}: { 
  children: ReactNode; 
  initialBranding: Branding; 
}) {
  const [branding, setBranding] = useState<Branding>(initialBranding);

  // This is the "Magic Function" Jamie calls
  const updateBranding = (newSettings: Partial<Branding>) => {
    setBranding((prev) => ({
      ...prev,
      ...newSettings,
    }));
  };

  // Sync state to CSS Variables in the DOM
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', branding.primaryColor);
    root.style.setProperty('--font-family', branding.fontFamily);
    root.style.setProperty('--border-radius', branding.borderRadius);
    
    // Log for the developer (Taz) to see the ML working
    console.log('🎨 Theme Updated via Jamie:', branding);
  }, [branding]);

  return (
    <ThemeContext.Provider value={{ branding, updateBranding }}>
      <div 
        style={{ 
          '--primary-color': branding.primaryColor,
          fontFamily: branding.fontFamily 
        } as React.CSSProperties}
        className="min-h-screen transition-colors duration-500"
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