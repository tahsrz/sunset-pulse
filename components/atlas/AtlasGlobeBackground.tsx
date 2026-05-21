'use client';

import React, { useEffect, useState } from 'react';
import AtlasGlobeCanvas, { AtlasGlobe } from './AtlasGlobeCanvas';

export default function AtlasGlobeBackground() {
  const [globe, setGlobe] = useState<AtlasGlobe | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/tah/atlas/globe', { cache: 'no-store' })
      .then(response => response.json())
      .then(data => {
        if (!cancelled) setGlobe(data);
      })
      .catch(() => {
        if (!cancelled) setGlobe(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#061017]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(34,211,238,0.26),transparent_22rem),radial-gradient(circle_at_42%_52%,rgba(250,204,21,0.15),transparent_26rem),radial-gradient(circle_at_58%_48%,rgba(244,114,182,0.14),transparent_28rem),linear-gradient(135deg,#061017_0%,#0c1f2c_46%,#171f38_100%)]" />

      {globe ? (
        <div className="absolute inset-[-8%] opacity-90">
          <AtlasGlobeCanvas
            globe={globe}
            showFeed={false}
            showMetrics={false}
            backgroundMode
            spinSpeed={0.001}
          />
        </div>
      ) : (
        <div className="absolute left-1/2 top-1/2 h-[min(72vw,72vh)] w-[min(72vw,72vh)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/20 bg-cyan-200/5 shadow-[0_0_90px_rgba(34,211,238,0.24)] animate-pulse" />
      )}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(2,6,23,0.08)_34%,rgba(2,6,23,0.72)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#061017]/30 via-transparent to-[#061017]/88" />
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.22) 1px, transparent 0)', backgroundSize: '42px 42px' }}
      />
    </div>
  );
}
