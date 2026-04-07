import React from 'react';
import { FaPalette } from 'react-icons/fa';

interface VibeConfig {
  primaryColor: string;
  mainBackground: string;
  navBackground: string;
  quadrants: {
    topLeft: { background: string; color: string };
    topRight: { background: string; color: string };
    bottomLeft: { background: string; color: string };
    bottomRight: { background: string; color: string };
  };
}

interface VibeCardProps {
  name: string;
  config: VibeConfig;
  isStaged: boolean;
  onStage: (config: VibeConfig) => void;
}

const VibeCard: React.FC<VibeCardProps> = ({ name, config, isStaged, onStage }) => {
  return (
    <div 
      onClick={() => onStage(config)}
      className={`group cursor-pointer bg-white/5 border border-white/10 rounded-3xl p-6 transition-all duration-500 hover:border-[var(--primary-color)] hover:bg-white/10 ${
        isStaged ? 'ring-2 ring-[var(--primary-color)]' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-6">
        <h3 className="font-black uppercase text-sm tracking-widest">{name}</h3>
        <FaPalette className="opacity-20 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Mini Quadrant Preview */}
      <div className="grid grid-cols-2 grid-rows-2 h-32 rounded-xl overflow-hidden shadow-2xl border border-white/5 transition-transform group-hover:scale-105 duration-500">
        <div style={{ background: config.quadrants.topLeft.background }} className="border-r border-b border-white/5" />
        <div style={{ background: config.quadrants.topRight.background }} className="border-b border-white/5" />
        <div style={{ background: config.quadrants.bottomLeft.background }} className="border-r border-white/5" />
        <div style={{ background: config.quadrants.bottomRight.background }} />
      </div>

      <div className="mt-6 flex justify-between items-center">
        <div className="flex gap-1">
          <div style={{ background: config.primaryColor }} className="w-3 h-3 rounded-full" />
          <div style={{ background: config.mainBackground }} className="w-3 h-3 rounded-full border border-white/10" />
          <div style={{ background: config.navBackground }} className="w-3 h-3 rounded-full border border-white/10" />
        </div>
        <span className="text-[9px] font-black uppercase opacity-30 group-hover:opacity-100 transition-opacity">Stage Vibe</span>
      </div>
    </div>
  );
};

export default VibeCard;
