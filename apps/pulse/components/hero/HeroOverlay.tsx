import React from 'react';
import Link from 'next/link';
import { Compass, Search, Flame } from 'lucide-react';
import marketingCopy from '@/config/marketing_copy.json';

const HeroOverlay: React.FC = () => {
  const { hero, cta } = marketingCopy;
  const titleWords = hero.title.split(' ');

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6 backdrop-blur-[10px]">
      <div className="relative z-40 w-full max-w-3xl flex flex-col items-center text-center">
        <div className="relative mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[-1]">
            <div className="absolute h-36 w-36 rounded-full border border-cyan-200/30 animate-pulse-expand" />
            <div className="absolute h-36 w-36 rounded-full border border-amber-200/25 animate-pulse-expand [animation-delay:1.6s]" />
            <div className="absolute h-36 w-36 rounded-full border border-rose-200/20 animate-pulse-expand [animation-delay:3.2s]" />
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 uppercase italic drop-shadow-[0_0_32px_rgba(34,211,238,0.28)]">
            {titleWords[0]} <span className="waterlily-heading italic">{titleWords.slice(1).join(' ')}</span>
          </h1>
          <p className="text-base md:text-lg text-slate-200 max-w-xl mx-auto font-medium tracking-wide drop-shadow-[0_2px_18px_rgba(2,6,23,0.75)]">
            {hero.subtitle}. {hero.description}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row flex-wrap justify-center">
          <Link
            href="/atlas"
            className="group relative flex items-center gap-4 rounded-full px-10 py-5 waterlily-button font-black uppercase text-xl hover:scale-105 transition-transform duration-300"
          >
            <Compass size={24} />
            <span>{cta.button_text}</span>
            <div className="absolute -inset-1 rounded-full bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            {/* Hover Pulse Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-white/40 opacity-0 group-hover:animate-pulse-expand pointer-events-none" />
          </Link>
          <Link
            href="/idx"
            className="group relative flex items-center gap-3 rounded-full border border-white/20 bg-black/35 px-6 py-4 text-sm font-black uppercase text-cyan-50 backdrop-blur-xl transition-all hover:border-cyan-200/50 hover:bg-cyan-200/10 hover:scale-105 duration-300"
          >
            <Search size={18} />
            <span>IDX Search</span>
            {/* Hover Pulse Ring */}
            <div className="absolute inset-0 rounded-full border border-cyan-400/50 opacity-0 group-hover:animate-pulse-expand pointer-events-none" />
          </Link>
          <Link
            href="/grill"
            className="group relative flex items-center gap-3 rounded-full border border-orange-500/30 bg-black/45 px-6 py-4 text-sm font-black uppercase text-amber-50 backdrop-blur-xl transition-all hover:border-orange-400/60 hover:bg-orange-950/20 hover:text-orange-200 hover:scale-105 duration-300"
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
