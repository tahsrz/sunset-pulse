'use client';

import React, { useMemo } from 'react';
import { Vector } from '@/lib/visualization/engine/math';
import { FaBroadcastTower, FaShieldAlt, FaMapMarkerAlt } from 'react-icons/fa';

interface IntelSpireProps {
  position: Vector;
  label: string;
  intel: string;
  color: string;
  renderer: any;
  camRot: any;
  camPos: any;
}

const IntelSpire = ({ position, label, intel, color, renderer, camRot, camPos }: IntelSpireProps) => {
  const screenPos = renderer?.projectPoint(position, new Vector(0,0,0), camRot, new Vector(0,0,0));
  
  if (!screenPos || screenPos.z <= 0) return null;

  const scale = Math.max(0.4, Math.min(1.2, 300 / screenPos.z));
  const opacity = Math.max(0, Math.min(1, (1500 - screenPos.z) / 1000));

  return (
    <div 
      className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-full group"
      style={{ 
        left: screenPos.x, 
        top: screenPos.y, 
        opacity,
        zIndex: Math.floor(2000 - screenPos.z)
      }}
    >
      {/* The "Spire" Visual */}
      <div className="flex flex-col items-center">
        {/* Label Box */}
        <div className="mb-2 bg-black/80 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-xl min-w-[180px] shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover:border-primary/50 group-hover:scale-110">
          <div className="flex items-center gap-2 mb-1">
            <FaBroadcastTower size={10} style={{ color }} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">{label}</span>
          </div>
          <p className="text-[9px] text-white/60 leading-tight italic">{intel}</p>
          
          {/* Decorative scan line */}
          <div className="mt-2 h-[1px] w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        {/* Vertical Line */}
        <div 
          className="w-[2px] h-24 animate-pulse" 
          style={{ 
            background: `linear-gradient(to bottom, ${color}, transparent)`,
            boxShadow: `0 0 15px ${color}`
          }} 
        />
        
        {/* Base Ring */}
        <div 
          className="w-4 h-4 rounded-full border-2 animate-ping" 
          style={{ borderColor: color }} 
        />
      </div>
    </div>
  );
};

interface GhostReconOverlaysProps {
  latestBriefing: any;
  renderer: any;
  camRot: any;
  camPos: any;
  property: any;
}

const GhostReconOverlays: React.FC<GhostReconOverlaysProps> = ({ latestBriefing, renderer, camRot, camPos, property }) => {
  const overlays = useMemo(() => {
    if (!latestBriefing || !latestBriefing.news_articles) return [];

    return latestBriefing.news_articles.map((article: any, idx: number) => {
      // Logic: If Frisco is mentioned, place it at a specific "north" offset
      // If Alliance is mentioned, create a "Corridor" effect
      
      const title = article.title.toLowerCase();
      let pos = new Vector(0,0,0);
      let color = '#3b82f6'; // Default Intel Blue
      let type = 'SPIRE';

      if (title.includes('frisco') || title.includes('tarrant')) {
        pos = new Vector(20, 20, -20);
        color = '#a855f7'; // Purple for Zoning/Anomalies
      } else if (title.includes('alliance') || title.includes('industrial')) {
        pos = new Vector(-25, 10, 20);
        color = '#22c55e'; // Green for Growth/Alliance
      } else {
        // Random-ish offset for general intel
        pos = new Vector((idx % 2 === 0 ? 1 : -1) * 30, 15, (idx % 3 === 0 ? 1 : -1) * 20);
      }

      return {
        id: `intel-${idx}`,
        type,
        position: pos,
        label: article.geo_tag?.label || 'Intel Signal',
        intel: article.title,
        color
      };
    });
  }, [latestBriefing]);

  if (!renderer) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {overlays.map(overlay => (
        <IntelSpire
          key={overlay.id}
          position={overlay.position}
          label={overlay.label}
          intel={overlay.intel}
          color={overlay.color}
          renderer={renderer}
          camRot={camRot}
          camPos={camPos}
        />
      ))}
    </div>
  );
};

export default GhostReconOverlays;
