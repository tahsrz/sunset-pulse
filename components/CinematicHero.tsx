'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from '@/context/ThemeProvider';
import { usePathname } from 'next/navigation';
import HeroOverlay from './hero/HeroOverlay';
import HeroSearch from './hero/HeroSearch';

// Dynamic import for heavy R3F Scene
const Live3DScene = dynamic(() => import('./hero/Live3DScene'), { 
  ssr: false,
  loading: () => <div className="absolute inset-0 waterlily-surface animate-pulse" />
});

const CinematicHero = () => {
  const { isAdvancedMode } = useTheme();
  const [isEntered, setIsEntered] = useState(false);
  const [query, setQuery] = useState('');
  const pathname = usePathname();

  // Reset tour state if we are on root and somehow stayed entered (e.g. Navbar click)
  useEffect(() => {
    if (pathname === '/') {
      setIsEntered(false);
    }
  }, [pathname]);

  const handleEnter = () => {
    setIsEntered(true);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden waterlily-surface">
      
      {/* LAYER 1: Bottom Layer - Live 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Live3DScene />
      </div>

      {/* LAYER 2: Middle Layer - Hero Video/Image Cinematic Loop */}
      <div 
        className={`absolute inset-0 z-10 transition-all duration-2000 ease-in-out ${
          isEntered ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#102a3a]/30 to-[#081824] z-20" />
        <div 
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600585154340-be6191da95b4?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center"
        />
        <div className="absolute inset-0 z-20 mix-blend-screen opacity-60 bg-[radial-gradient(circle_at_20%_24%,rgba(242,154,180,0.34),transparent_24rem),radial-gradient(circle_at_78%_18%,rgba(63,183,163,0.32),transparent_28rem),radial-gradient(circle_at_52%_62%,rgba(184,167,255,0.24),transparent_32rem)]" />
        <div className="absolute inset-0 z-20 opacity-20" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      {/* LAYER 3: Top Layer - Simple Overlay UI */}
      <HeroOverlay isEntered={isEntered} onEnter={handleEnter} />

      {/* POST-ENTER UI: Appears after "Start" is clicked */}
      <HeroSearch 
        isEntered={isEntered} 
        isAdvancedMode={isAdvancedMode} 
        query={query} 
        setQuery={setQuery} 
      />
    </div>
  );
};

export default CinematicHero;
