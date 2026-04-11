'use client';

import { useEffect, useRef } from 'react';
import { useJamieInsights } from '@/hooks/useJamieInsights';
import { toast } from 'react-toastify';
import { FaBrain } from 'react-icons/fa';

export default function JamieInsightsLoginToast() {
  const { jamieInsights, loading } = useJamieInsights();
  const hasShown = useRef(false);

  useEffect(() => {
    // We only want to show this once per "session" start (e.g. after login redirect)
    // We can use a session flag
    const sessionFlag = sessionStorage.getItem('jamie_insight_shown');
    
    if (!loading && jamieInsights.length > 0 && !sessionFlag && !hasShown.current) {
      // Pick high importance insights
      const criticalInsights = jamieInsights.filter((i: any) => i.importance === 'high');
      
      if (criticalInsights.length > 0) {
        // Show the first critical one
        const insight = criticalInsights[0];
        
        toast.info(
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-400">
              <FaBrain /> Jamie Critical Insight
            </div>
            <div className="font-bold text-sm text-white">{insight.question}</div>
            <div className="text-xs text-white/60 line-clamp-2">{insight.answer}</div>
          </div>,
          {
            position: "top-right",
            autoClose: 8000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "dark",
            icon: false,
            className: "!bg-slate-900 !border !border-blue-500/30 !rounded-2xl !backdrop-blur-xl"
          }
        );

        sessionStorage.setItem('jamie_insight_shown', 'true');
        hasShown.current = true;
      }
    }
  }, [jamieInsights, loading]);

  return null;
}
