'use client';

import React, { useState } from 'react';
import AtlasGlobeBackground from '@/components/atlas/AtlasGlobeBackground';
import HeroOverlay from './hero/HeroOverlay';
import HeroNewsTabs from './hero/HeroNewsTabs';
import { Eye, EyeOff } from 'lucide-react';

const CinematicHero = () => {
  const [isUIVisible, setIsUIVisible] = useState(true);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#061017]">
      <div className="absolute inset-0 z-0">
        <AtlasGlobeBackground />
      </div>

      <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_48%,transparent_0%,rgba(2,6,23,0.18)_36%,rgba(2,6,23,0.78)_100%)]" />
      <div className="absolute inset-0 z-20 bg-gradient-to-b from-black/20 via-transparent to-[#061017]/80" />

      {isUIVisible && (
        <div className="animate-in fade-in duration-1000">
          <HeroOverlay />
        </div>
      )}

      <div className="animate-in fade-in duration-700 delay-500">
        <HeroNewsTabs />
      </div>

      {/* Zen Mode Toggle */}
      <button
        onClick={() => setIsUIVisible(!isUIVisible)}
        className="absolute bottom-24 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-xl transition-all hover:border-cyan-300/50 hover:bg-black/60 hover:text-cyan-300 md:bottom-28 md:right-10"
        title={isUIVisible ? "Hide Interface" : "Show Interface"}
      >
        {isUIVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        <div className="absolute -inset-1 rounded-full bg-cyan-500/10 blur-md opacity-0 hover:opacity-100 transition-opacity" />
      </button>
    </div>
  );
};

export default CinematicHero;

export default CinematicHero;
