'use client';

import dynamic from 'next/dynamic';

const CinematicHero = dynamic(() => import('@/components/CinematicHero'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-[#061017]">
      <div className="animate-pulse text-cyan-500/30 font-black uppercase tracking-[0.4em]">Initializing Hero...</div>
    </div>
  ),
});

const VirtualWorldHub = dynamic(() => import('@/components/world/VirtualWorldHub'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[800px] w-full items-center justify-center border-y border-white/5 bg-[#081824]">
      <div className="animate-pulse text-teal-500/30 font-black uppercase tracking-[0.4em]">Loading Platform Map...</div>
    </div>
  ),
});

export function HomeHero() {
  return <CinematicHero />;
}

export function HomeWorldHub() {
  return <VirtualWorldHub />;
}
