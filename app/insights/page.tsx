'use client';

import React from 'react';
import { useJamieInsights } from '@/hooks/useJamieInsights';
import JamieInsightCard from '@/components/JamieInsightCard';
import { FaBrain, FaBolt, FaArrowRight } from 'react-icons/fa';
import Link from 'next/link';

const InsightsPage = () => {
  const { jamieInsights, loading, error } = useJamieInsights();

  if (error) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center p-8 bg-rose-500/10 border border-rose-500/20 rounded-3xl backdrop-blur-xl">
        <h2 className="text-xl font-bold text-rose-500 mb-2">Protocol Interrupted</h2>
        <p className="text-rose-400 text-xs uppercase tracking-widest">Failed to retrieve spatial dreams.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 pt-32 pb-24 px-6 overflow-hidden">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 text-blue-500 mb-6 animate-pulse">
              <FaBrain size={24} />
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Neural_Intelligence_Feed</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white mb-6 leading-[0.9]">
              Jamie's <span className="text-blue-500">Spatial Dreams</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-xl border-l-2 border-blue-500/30 pl-6">
              Critical insights extracted from the Jamie Dream Bridge. Real-time predictive intelligence for your real estate tactical sprint.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl">
              <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Active Insights</div>
              <div className="text-2xl font-mono text-blue-500 font-bold tracking-tighter">
                {loading ? '--' : jamieInsights.length.toString().padStart(2, '0')}
              </div>
            </div>
            <Link 
              href="/command-post"
              className="px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center gap-4 transition-all group"
            >
              <div className="text-left">
                <div className="text-[8px] font-black uppercase tracking-widest opacity-60">Control Center</div>
                <div className="text-sm font-bold tracking-tight">Command Post</div>
              </div>
              <FaArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-80 bg-white/5 border border-white/10 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {jamieInsights.map((insight: any) => (
              <JamieInsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}

        <div className="mt-20 p-12 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-[3rem] backdrop-blur-2xl relative overflow-hidden group">
          <FaBolt className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500/5 text-[20rem] rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-left">
            <div>
              <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Need a customized tactical sprint?</h2>
              <p className="text-slate-300 max-w-xl">
                Jamie can generate a high-stakes intelligence report tailored to your specific goals and asset portfolio.
              </p>
            </div>
            <button className="px-10 py-5 bg-white text-black font-black uppercase text-[10px] tracking-[0.4em] rounded-full hover:bg-blue-500 hover:text-white transition-all shadow-2xl shadow-white/5">
              Initialize Deep Recon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsPage;
