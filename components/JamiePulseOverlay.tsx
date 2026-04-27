'use client';

import React from 'react';
import { useJamiePulse } from '@/context/JamiePulseContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, Zap, Activity } from 'lucide-react';
import TacticalCloth from './TacticalCloth';
import { useEffect, useState } from 'react';

const JamiePulseOverlay = () => {
  const { showOverlay, setShowOverlay, latestBriefing } = useJamiePulse();
  const [activeEnvoy, setActiveEnvoy] = useState<any>(null);

  useEffect(() => {
    if (showOverlay) {
      // Simple fetch for the active persona visuals
      fetch('/api/entities/active-envoy')
        .then(res => res.json())
        .then(data => setActiveEnvoy(data.envoy))
        .catch(err => console.error("Failed to load envoy visuals:", err));
    }
  }, [showOverlay]);

  if (!showOverlay || !latestBriefing) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-950/90 backdrop-blur-xl"
      >
        {/* Background Ripple Effects */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <div className="absolute h-64 w-64 rounded-full border border-primary/30 animate-pulse-expand" />
          <div className="absolute h-64 w-64 rounded-full border border-primary/20 animate-pulse-expand [animation-delay:1s]" />
          <div className="absolute h-64 w-64 rounded-full border border-primary/10 animate-pulse-expand [animation-delay:2s]" />
        </div>

        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="relative z-10 w-full max-w-4xl bg-slate-900/50 border border-primary/20 rounded-3xl p-8 md:p-12 shadow-2xl overflow-hidden"
        >
          {/* Subtle Scanline Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-recon-scan opacity-10" />

          <button
            onClick={() => setShowOverlay(false)}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full"
          >
            <X size={24} />
          </button>

          <div className="relative flex flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold tracking-widest uppercase italic animate-pulse">
              <Activity size={16} />
              Live Intelligence Pulse Detected
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-center mb-12 w-full">
              <div className="shrink-0">
                <TacticalCloth 
                  id={activeEnvoy?.uid || "JAMIE-01"} 
                  status={activeEnvoy?.role || "BROADCASTING"} 
                  moodColor={activeEnvoy?.visual?.meshColor || "#3b82f6"} 
                  videoSrc={activeEnvoy?.visual?.assetPath || "/videos/jamie_base.mp4"}
                />
              </div>
              <div className="text-left">
                <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 italic uppercase">
                  {activeEnvoy?.name || "Jamie"} Research <span className="text-primary">Consolidated</span>
                </h2>
                <p className="text-xl text-slate-400 max-w-2xl">
                  Jamie finished a {latestBriefing.simulated_research_hours}-hour regional brief.
                  Here is the summary, top signal, and copy-risk check in one place.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
              {/* Daily Truth */}
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex items-center gap-3 text-primary mb-4">
                  <Cpu size={20} />
                  <h3 className="font-bold uppercase tracking-wider text-sm">Executive Summary</h3>
                </div>
                <p className="text-slate-200 leading-relaxed italic">
                  "{latestBriefing.executive_summary}"
                </p>
              </div>

              {/* Latest News */}
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex items-center gap-3 text-intel-green mb-4">
                  <Zap size={20} />
                  <h3 className="font-bold uppercase tracking-wider text-sm">Top Market Signal</h3>
                </div>
                <div className="space-y-3">
                  <div className="border-l-2 border-intel-green/30 pl-4">
                    <h4 className="text-white font-medium text-sm mb-1">{latestBriefing.top_headline}</h4>
                    <p className="text-slate-400 text-xs">
                      {latestBriefing.key_signal_count} active signal{latestBriefing.key_signal_count === 1 ? '' : 's'} in this briefing.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex items-center gap-3 text-amber-400 mb-4">
                  <Activity size={20} />
                  <h3 className="font-bold uppercase tracking-wider text-sm">Language QA</h3>
                </div>
                <div className="space-y-2">
                  <p className="text-white text-sm font-semibold">
                    {latestBriefing.ozriel_audit.humanized_rewrites.length} rewrite{latestBriefing.ozriel_audit.humanized_rewrites.length === 1 ? '' : 's'} suggested
                  </p>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Ozriel flagged phrases that sound generated and prepared cleaner alternatives before anything ships.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowOverlay(false)}
              className="mt-12 px-8 py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.5)] uppercase tracking-widest italic"
            >
              Acknowledge Intel
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default JamiePulseOverlay;
