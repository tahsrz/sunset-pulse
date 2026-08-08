'use client';

import React, { useState } from 'react';
import AtlasGlobeBackground from '@/components/atlas/AtlasGlobeBackground';
import HeroOverlay from './hero/HeroOverlay';
import HeroNewsTabs from './hero/HeroNewsTabs';
import { Eye, EyeOff } from 'lucide-react';

const CinematicHero: React.FC = () => {
  const [isUIVisible, setIsUIVisible] = useState(true);

  return (
    <section className="relative h-screen w-full overflow-hidden bg-[#061017]">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
        <AtlasGlobeBackground />
      </div>

      {/* Radial and Linear Gradient Overlays */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_48%,transparent_0%,rgba(2,6,23,0.18)_36%,rgba(2,6,23,0.78)_100%)]" />
      <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-black/20 via-transparent to-[#061017]/80" />

      {/* Main Hero Overlay with Smooth Fade Transition */}
      <div
        className={`transition-opacity duration-500 ease-in-out ${
          isUIVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <HeroOverlay />
      </div>

      {/* News Tabs / Ticker */}
      <div className="animate-in fade-in duration-700 delay-500">
        <HeroNewsTabs />
      </div>

      {/* Zen Mode Toggle */}
      <button
        type="button"
        onClick={() => setIsUIVisible((prev) => !prev)}
        className="group absolute bottom-24 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-xl transition-all hover:border-cyan-300/50 hover:bg-black/60 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 md:bottom-28 md:right-10"
        title={isUIVisible ? 'Hide Interface' : 'Show Interface'}
        aria-label={isUIVisible ? 'Hide Interface' : 'Show Interface'}
      >
        <span className="relative z-10">
          {isUIVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        </span>
        <div className="pointer-events-none absolute -inset-1 rounded-full bg-cyan-500/20 blur-md opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </button>
    </section>
  );
};

export default CinematicHero;