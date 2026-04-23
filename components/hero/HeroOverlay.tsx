import React from 'react';
import { Play } from 'lucide-react';
import marketingCopy from '@/config/marketing_copy.json';

interface HeroOverlayProps {
  isEntered: boolean;
  onEnter: () => void;
}

const HeroOverlay: React.FC<HeroOverlayProps> = ({ isEntered, onEnter }) => {
  const { hero, cta } = marketingCopy;

  return (
    <div 
      className={`absolute inset-0 z-30 flex flex-col items-center justify-center px-6 transition-all duration-[1500ms] ease-in-out ${
        isEntered ? 'opacity-0 pointer-events-none backdrop-blur-none' : 'opacity-100 backdrop-blur-[20px]'
      }`}
    >
      <div className="relative z-40 w-full max-w-4xl flex flex-col items-center text-center">
        
        {/* Text Container with Centered Ripples */}
        <div className="relative mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {/* Ripples originating from text */}
          {!isEntered && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[-1]">
              <div className="absolute h-32 w-32 rounded-full border border-primary/30 animate-pulse-expand" />
              <div className="absolute h-32 w-32 rounded-full border border-primary/30 animate-pulse-expand [animation-delay:2s]" />
            </div>
          )}
          
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-white mb-6 uppercase italic">
            {hero.title.split(' ')[0]} <span className="text-primary italic">{hero.title.split(' ')[1]}</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto font-medium tracking-wide">
            {hero.subtitle}. {hero.description}
          </p>
        </div>

        <button 
          onClick={onEnter}
          className="group relative flex items-center gap-4 px-10 py-5 bg-white text-slate-950 rounded-full font-black uppercase tracking-widest text-xl transition-all hover:scale-105 hover:bg-primary hover:text-white shadow-[0_0_50px_rgba(255,255,255,0.2)]"
        >
          <Play size={24} className="fill-current" />
          <span>{cta.button_text}</span>
          <div className="absolute -inset-1 rounded-full bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        <div className="mt-8 text-slate-500 font-mono text-[10px] uppercase tracking-[0.5em]">
          Institutional Real Estate // North Texas
        </div>
      </div>
    </div>
  );
};

export default HeroOverlay;
