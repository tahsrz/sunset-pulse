'use client';

import React, { useMemo } from 'react';
import { Vector } from '@/lib/visualization/engine/math';
import { FaBroadcastTower, FaShieldAlt, FaMapMarkerAlt, FaIndustry, FaHome, FaCity, FaDatabase } from 'react-icons/fa';

interface IntelSpireProps {
  position: Vector;
  label: string;
  intel: string;
  color: string;
  renderer: any;
  camRot: any;
  camPos: any;
  icon?: React.ReactNode;
}

const IntelSpire = ({ position, label, intel, color, renderer, camRot, camPos, icon }: IntelSpireProps) => {
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
            <span style={{ color }}>{icon || <FaBroadcastTower size={10} className="animate-pulse" />}</span>
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
      // 1. Determine Position
      let pos = new Vector(0,0,0);
      
      if (article.geo_tag?.lat && article.geo_tag?.lng) {
        // Simple mapping of lat/lng relative to property
        // This is a mock spatial projection for the 3D viewer
        const latOffset = (article.geo_tag.lat - (property?.location?.lat || 33.1)) * 5000;
        const lngOffset = (article.geo_tag.lng - (property?.location?.lng || -96.8)) * 5000;
        pos = new Vector(lngOffset, 15, -latOffset);
      } else {
        // Fallback positioning logic
        const title = article.title.toLowerCase();
        if (title.includes('frisco') || title.includes('tarrant')) {
          pos = new Vector(20, 20, -20);
        } else if (title.includes('alliance') || title.includes('industrial')) {
          pos = new Vector(-25, 10, 20);
        } else {
          pos = new Vector((idx % 2 === 0 ? 1 : -1) * (30 + idx * 5), 15, (idx % 3 === 0 ? 1 : -1) * (20 + idx * 2));
        }
      }

      // 2. Determine Style from Visualizer Config
      let color = article.visualizer_config?.color || '#3b82f6';
      let icon = <FaBroadcastTower size={10} className="animate-pulse" />;

      switch (article.visualizer_config?.type) {
        case 'GABLE_HOUSE':
          icon = <FaHome size={10} />;
          break;
        case 'MODERN_OFFICE':
          icon = <FaCity size={10} />;
          break;
        case 'INDUSTRIAL_HUB':
          icon = <FaIndustry size={10} />;
          color = color === '#3b82f6' ? '#22c55e' : color; // Emerald for growth
          break;
        case 'DATA_PLOT':
          icon = <FaDatabase size={10} />;
          break;
      }

      // 3. Fallback color logic based on title if no config
      if (!article.visualizer_config) {
        const title = article.title.toLowerCase();
        if (title.includes('frisco') || title.includes('tarrant')) {
          color = '#a855f7'; // Purple for Zoning/Anomalies
        } else if (title.includes('alliance') || title.includes('industrial')) {
          color = '#22c55e'; // Green for Growth
        }
      }

      return {
        id: `intel-${idx}`,
        position: pos,
        label: article.geo_tag?.label || article.category || 'Intel Signal',
        intel: article.title,
        color,
        icon
      };
    });
  }, [latestBriefing, property]);

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
          icon={overlay.icon}
        />
      ))}
    </div>
  );
};

export default GhostReconOverlays;
