'use client';

import React from 'react';
import AtlasGlobeBackground from '@/components/atlas/AtlasGlobeBackground';
import HeroOverlay from './hero/HeroOverlay';

const CinematicHero = () => {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#061017]">
      <div className="absolute inset-0 z-0">
        <AtlasGlobeBackground />
      </div>

      <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_48%,transparent_0%,rgba(2,6,23,0.18)_36%,rgba(2,6,23,0.78)_100%)]" />
      <div className="absolute inset-0 z-20 bg-gradient-to-b from-black/20 via-transparent to-[#061017]/80" />

      <HeroOverlay />
    </div>
  );
};

export default CinematicHero;
