'use client';

import React, { createContext, useContext, ReactNode } from 'react';

interface Branding {
  primaryColor: string;
  fontFamily: string;
  siteName: string;
}

const ThemeContext = createContext<Branding | undefined>(undefined);

export function ThemeProvider({ 
  branding, 
  children 
}: { 
  branding: Branding; 
  children: ReactNode; 
}) {
  return (
    <ThemeContext.Provider value={branding}>
      {/* This 'style' tag injects Jamie's chosen colors into CSS variables */}
      <style jsx global>{`
        :root {
          --primary-color: ${branding.primaryColor};
          --font-family: ${branding.fontFamily}, sans-serif;
        }
        body {
          font-family: var(--font-family);
        }
      `}</style>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};