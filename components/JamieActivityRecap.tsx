'use client';

import React, { useEffect, useState } from 'react';
import { FaBrain, FaTimes, FaVolumeUp } from 'react-icons/fa';
import { memoryBridge } from '@/lib/memory_bridge';
import { speak } from '@/lib/core/tts';

const JamieActivityRecap = () => {
  const [recap, setRecap] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const generateRecap = async () => {
      const history = memoryBridge.getHistory();
      const coreInsights = memoryBridge.getCoreInsights();
      const activityLogs = memoryBridge.getActivityLogs();
      
      const hasSignificantHistory = history.length > 2 || coreInsights.length > 0;
      if (!hasSignificantHistory) return; 

      // Check if already showed a recap this session
      const lastRecapTime = sessionStorage.getItem('last_activity_recap');
      const now = new Date().getTime();
      
      // If shown in the last 30 minutes, skip
      if (lastRecapTime && now - parseInt(lastRecapTime) < 1800000) return;

      setLoading(true);
      try {
        const res = await fetch('/api/jamie/recap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ history, coreInsights, activityLogs })
        });

        if (res.ok) {
          const data = await res.json();
          setRecap(data.recap);
          setIsVisible(true);
          sessionStorage.setItem('last_activity_recap', now.toString());
          
          // Delay for TTS to feel "live"
          setTimeout(() => {
            speak(data.recap.replace('[SESSION_RECAP]', '').trim());
          }, 1000);
        }
      } catch (error) {
        console.error('Recap failed:', error);
      } finally {
        setLoading(false);
      }
    };

    generateRecap();
  }, []);

  if (!isVisible || !recap) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] w-full max-w-lg px-4 animate-in slide-in-from-top-10 duration-700">
      <div className="bg-slate-900/90 backdrop-blur-3xl border border-blue-500/30 rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(37,99,235,0.2)] relative overflow-hidden group">
        {/* Animated Scanning Line */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan" />
        
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FaBrain className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-blue-400">Jamie's Activity Briefing</h3>
              <p className="text-[8px] font-mono text-slate-500 uppercase">Jamie Intelligence // Session_Restore</p>
            </div>
          </div>
          <button 
            onClick={() => setIsVisible(false)}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <FaTimes size={14} />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-blue-50 leading-relaxed italic font-medium">
            {recap.replace('[SESSION_RECAP]', '').trim()}
          </p>
          
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-[8px] font-black uppercase text-slate-500 tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
              Jamie Synchronized
            </div>
            <button 
              onClick={() => speak(recap.replace('[SESSION_RECAP]', '').trim())}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-blue-400 transition-all"
            >
              <FaVolumeUp size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JamieActivityRecap;
