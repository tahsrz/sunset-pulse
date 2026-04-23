import React from 'react';

interface PulsarSpriteProps {
  intensity?: number;
  status?: 'idle' | 'success' | 'ai' | 'active' | 'processing' | 'engagement';
}

const PulsarSprite: React.FC<PulsarSpriteProps> = ({ intensity = 1, status = 'idle' }) => {
  const glowColor = 
    status === 'success' ? '#4ade80' : 
    status === 'ai' ? '#3b82f6' : 
    status === 'active' ? '#fbbf24' : 
    '#22c55e';
  
  return (
    <div className={`relative flex items-center justify-center transition-all duration-1000 ${status === 'active' || status === 'ai' ? 'scale-110' : 'scale-100'}`}>
      <div 
        className="absolute rounded-full blur-2xl animate-pulse"
        style={{ 
          width: `${100 * intensity}px`, 
          height: `${100 * intensity}px`, 
          backgroundColor: glowColor,
          opacity: 0.3 
        }}
      />
      <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 30C10 10 5 25 15 40" stroke="#16a34a" strokeWidth="6" strokeLinecap="round" />
        <path d="M80 30C90 10 95 25 85 40" stroke="#16a34a" strokeWidth="6" strokeLinecap="round" />
        <ellipse cx="50" cy="55" rx="35" ry="30" fill="#22c55e" />
        <circle cx="35" cy="50" r="6" fill="white" />
        <circle cx="65" cy="50" r="6" fill="white" />
        <circle cx="37" cy="48" r="2" fill="black" />
        <circle cx="67" cy="48" r="2" fill="black" />
        <path d="M25 75C35 85 65 85 75 75C70 65 30 65 25 75Z" fill="#15803d" />
      </svg>
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-xl whitespace-nowrap text-[10px] font-mono uppercase tracking-tighter text-green-400">
        {status === 'idle' && "Grid Reconnaissance: Standing By."}
        {status === 'ai' && "Jamie: DNA Query Engine Active."}
        {status === 'success' && "Intelligence Core Synchronized."}
        {status === 'processing' && "Analyzing Request DNA & Computational Weight..."}
        {status === 'engagement' && "High-Stakes Engagement Protocol Active."}
      </div>
    </div>
  );
};

export default PulsarSprite;
