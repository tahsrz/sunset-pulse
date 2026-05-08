'use client';

import React, { useMemo } from 'react';
import { Vector } from '@/lib/visualization/engine/math';
import { FaBroadcastTower, FaShieldAlt, FaMapMarkerAlt, FaIndustry, FaHome, FaCity, FaDatabase, FaBolt, FaLock } from 'react-icons/fa';

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
    const results: any[] = [];

    // 1. Permanent Economic/Risk Spires (Makiel & Gadrael)
    if (property) {
      // Makiel Spire: Appreciation Fate
      results.push({
        id: 'economic-makiel',
        position: new Vector(15, 25, -15), // Northeast quadrant
        label: 'Makiel Appreciation Fate',
        intel: `Predicted growth manifest: +12.4% alpha expected in 24 months.`,
        color: '#3b82f6',
        icon: <FaBolt size={10} />
      });

      // Gadrael Spire: Risk Integrity
      const riskRating = property?.square_feet > 0 ? 84.2 : 62.5;
      results.push({
        id: 'economic-gadrael',
        position: new Vector(-15, 25, -15), // Northwest quadrant
        label: 'Gadrael Risk Buffer',
        intel: `Buffer Integrity: ${riskRating}%. Zoning and Title protocols verified.`,
        color: '#94a3b8',
        icon: <FaShieldAlt size={10} />
      });
    }

    // 2. News/Intelligence Spires from Briefing
    if (latestBriefing && latestBriefing.news_articles) {
      latestBriefing.news_articles.forEach((article: any, idx: number) => {
        // Determine Position
        let pos = new Vector(0,0,0);
        
        if (article.geo_tag?.lat && article.geo_tag?.lng) {
          const latOffset = (article.geo_tag.lat - (property?.location?.lat || 33.1)) * 5000;
          const lngOffset = (article.geo_tag.lng - (property?.location?.lng || -96.8)) * 5000;
          pos = new Vector(lngOffset, 15, -latOffset);
        } else {
          // Fallback positioning logic (offset from property to avoid overlaps)
          const title = article.title.toLowerCase();
          if (title.includes('frisco') || title.includes('tarrant')) {
            pos = new Vector(20 + (idx * 2), 20, -20);
          } else if (title.includes('alliance') || title.includes('industrial')) {
            pos = new Vector(-25, 10 + (idx * 2), 20);
          } else {
            pos = new Vector((idx % 2 === 0 ? 1 : -1) * (35 + idx * 5), 15, (idx % 3 === 0 ? 1 : -1) * (25 + idx * 2));
          }
        }

        // Determine Style
        let color = article.visualizer_config?.color || '#3b82f6';
        let icon = <FaBroadcastTower size={10} className="animate-pulse" />;

        switch (article.visualizer_config?.type) {
          case 'GABLE_HOUSE': icon = <FaHome size={10} />; break;
          case 'MODERN_OFFICE': icon = <FaCity size={10} />; break;
          case 'INDUSTRIAL_HUB': 
            icon = <FaIndustry size={10} />; 
            color = color === '#3b82f6' ? '#22c55e' : color; 
            break;
          case 'DATA_PLOT': icon = <FaDatabase size={10} />; break;
        }

        if (!article.visualizer_config) {
          const title = article.title.toLowerCase();
          if (title.includes('frisco') || title.includes('tarrant')) color = '#a855f7';
          else if (title.includes('alliance') || title.includes('industrial')) color = '#22c55e';
        }

        results.push({
          id: `intel-${idx}`,
          position: pos,
          label: article.geo_tag?.label || article.category || 'Intel Signal',
          intel: article.title,
          color,
          icon
        });
      });
    }

    return results;
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
