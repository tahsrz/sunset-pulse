import React from 'react';
import Link from 'next/link';
import { Compass, Search, Flame } from 'lucide-react';
import marketingCopy from '@/config/marketing_copy.json';

const HeroOverlay: React.FC = () => {
  const { hero, cta } = marketingCopy;
  const titleWords = hero.title.split(' ');

  return (
    <div className="relative z-30 flex w-full flex-col items-center justify-center px-6">
      <div className="relative z-40 w-full max-w-3xl flex flex-col items-center text-center">
        <div className="relative mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[-1]">
            <div className="absolute h-36 w-36 rounded-full border border-cyan-200/30 animate-pulse-expand" />
            <div className="absolute h-36 w-36 rounded-full border border-amber-200/25 animate-pulse-expand [animation-delay:1.6s]" />
            <div className="absolute h-36 w-36 rounded-full border border-rose-200/20 animate-pulse-expand [animation-delay:3.2s]" />
          </div>

          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 uppercase italic drop-shadow-[0_0_32px_rgba(34,211,238,0.28)]">
            {titleWords[0]} <span className="waterlily-heading italic">{titleWords.slice(1).join(' ')}</span>
          </h2>
          <p className="text-base leading-7 md:text-lg text-slate-200 max-w-xl mx-auto font-medium drop-shadow-[0_2px_18px_rgba(2,6,23,0.75)]">
            {hero.subtitle}. {hero.description}
          </p>
        </div>

        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center justify-center">
          <Link
            href="/atlas"
            className="group relative flex min-h-14 items-center justify-center gap-3 rounded-full px-8 py-4 waterlily-button font-bold uppercase text-sm hover:scale-105 transition-transform duration-300"
          >
            <Compass size={24} />
            <span>{cta.button_text}</span>
            <div className="absolute -inset-1 rounded-full bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            {/* Hover Pulse Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-white/40 opacity-0 group-hover:animate-pulse-expand pointer-events-none" />
          </Link>
          <Link
            href="/idx"
            className="group relative flex min-h-14 items-center justify-center gap-3 rounded-full border border-white/20 bg-black/35 px-6 py-4 text-sm font-bold uppercase text-cyan-50 backdrop-blur-xl transition-all hover:border-cyan-200/50 hover:bg-cyan-200/10 hover:scale-105 duration-300"
          >
            <Search size={18} />
            <span>IDX Search</span>
            {/* Hover Pulse Ring */}
            <div className="absolute inset-0 rounded-full border border-cyan-400/50 opacity-0 group-hover:animate-pulse-expand pointer-events-none" />
          </Link>
          <Link
            href="/grill"
            className="group relative flex min-h-14 items-center justify-center gap-3 rounded-full border border-orange-500/30 bg-black/45 px-6 py-4 text-sm font-bold uppercase text-amber-50 backdrop-blur-xl transition-all hover:border-orange-400/60 hover:bg-orange-950/20 hover:text-orange-200 hover:scale-105 duration-300"
          >
            <Flame size={18} className="text-orange-400 group-hover:animate-pulse" />
            <span>The Grill</span>
            <div className="absolute -inset-1 rounded-full bg-orange-500/15 blur-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            {/* Hover Pulse Ring */}
            <div className="absolute inset-0 rounded-full border border-orange-400/50 opacity-0 group-hover:animate-pulse-expand pointer-events-none" />
          </Link>
        </div>

        <div className="mt-8 text-teal-100/70 font-mono text-[10px] uppercase">
          {cta.footer_note}
        </div>
      </div>
    </div>
  );
};

export default HeroOverlay;
