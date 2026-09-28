'use client';

import dynamic from 'next/dynamic';

const CinematicHero = dynamic(() => import('@/components/CinematicHero'), {
  ssr: false,
  loading: () => (
    <div role="status" className="flex min-h-[480px] w-full items-center justify-center bg-[#061017] px-6 sm:min-h-[560px]">
      <div className="animate-pulse text-center text-sm text-cyan-200/70">Loading Sunset Pulse…</div>
    </div>
  ),
});

const VirtualWorldHub = dynamic(() => import('@/components/world/VirtualWorldHub'), {
  ssr: false,
  loading: () => (
    <div role="status" className="flex min-h-[560px] w-full items-center justify-center border-y border-white/5 bg-[#081824] px-6">
      <div className="animate-pulse text-center text-sm text-teal-200/70">Loading platform map…</div>
    </div>
  ),
});

export function HomeHero() {
  return <CinematicHero />;
}

export function HomeWorldHub() {
  return <VirtualWorldHub />;
}
