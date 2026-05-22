'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { FaShieldAlt, FaEye, FaGhost, FaSpider, FaCrosshairs, FaBolt, FaGlobe, FaMap, FaRoute, FaUserTie } from 'react-icons/fa';

const InvestorBar: React.FC = () => {
  const pathname = usePathname();
  
  if (pathname !== '/investors') return null;

  const judges = [
    { name: 'Makiel', icon: <FaEye className="text-blue-400" />, status: 'ACTIVE_RECON' },
    { name: 'Gadrael', icon: <FaShieldAlt className="text-orange-400" />, status: 'SHIELD_LOCKED' },
    { name: 'Durandiel', icon: <FaGhost className="text-slate-400" />, status: 'GHOST_OPS' },
    { name: 'Telariel', icon: <FaSpider className="text-purple-400" />, status: 'GRID_CRAWL' },
    { name: 'Rezael', icon: <FaCrosshairs className="text-red-400" />, status: 'ATTACK_READY' },
    { name: 'Zakariel', icon: <FaBolt className="text-orange-500" />, status: 'VELOCITY_SYNC' },
  ];

  const highlights = [
    { label: 'The Pulse View', icon: <FaGlobe />, detail: '3D Spatial Search' },
    { label: 'Market Integration', icon: <FaMap />, detail: 'Live IDX Sync' },
    { label: 'The Roadmap', icon: <FaRoute />, detail: '2026-2027 Rollout' },
    { label: 'The Visionary', icon: <FaUserTie />, detail: 'Founder Intel' },
  ];

  return (
    <div className="w-full bg-slate-900/80 border-b border-orange-500/20 backdrop-blur-xl overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 h-10 flex items-center justify-between gap-8">
        {/* Judges Ticker */}
        <div className="flex-1 flex items-center gap-8 animate-marquee whitespace-nowrap">
          {[...judges, ...judges].map((j, i) => (
            <div key={i} className="flex items-center gap-2 group cursor-crosshair">
              <span className="text-[10px] font-black text-white/20 group-hover:text-blue-400 transition-colors uppercase tracking-widest">{j.name}</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/5 border border-blue-500/10">
                {j.icon}
                <span className="text-[8px] font-mono font-bold text-blue-400/60 tracking-tighter">{j.status}</span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Core Checklist / Slide Navigation Highlights */}
        <div className="hidden lg:flex items-center gap-6 border-l border-white/10 pl-8 h-full">
           {highlights.map((h, i) => (
             <div key={i} className="flex flex-col items-start leading-none group cursor-pointer">
                <div className="flex items-center gap-1.5 mb-0.5">
                   <span className="text-orange-500 text-[10px]">{h.icon}</span>
                   <span className="text-[9px] font-black uppercase tracking-tighter text-white/80 group-hover:text-orange-400 transition-colors">{h.label}</span>
                </div>
                <span className="text-[7px] font-mono text-white/20 uppercase tracking-[0.2em] ml-4">{h.detail}</span>
             </div>
           ))}
        </div>

        {/* Global Live Indicator */}
        <div className="flex items-center gap-3 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20 shrink-0">
           <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
           </div>
           <span className="text-[10px] font-black uppercase italic tracking-widest text-orange-500">Investor_Sync: Live</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          animation: marquee 40s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default InvestorBar;
