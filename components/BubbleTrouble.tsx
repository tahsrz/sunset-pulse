'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TacticalCloth from '@/components/TacticalCloth';
import { useVibe } from '@/context/VibeContext';

interface Bubble {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number; // 3 = Large, 2 = Medium, 1 = Small
}

interface LevelConfig {
  id: number;
  name: string;
  background: string;
  bubbles: Bubble[];
  vibe: string;
}

const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: 'Sector 01: Suburban_Infiltration',
    background: 'https://images.unsplash.com/photo-1600585154340-be6191da95b4?q=80&w=2070&auto=format&fit=crop',
    vibe: 'default',
    bubbles: [
      { id: '1-1', x: 200, y: 100, vx: 2, vy: 0, size: 3 }
    ]
  },
  {
    id: 2,
    name: 'Sector 02: Industrial_Logic',
    background: 'https://images.unsplash.com/photo-1558441719-ffb4d4500a67?q=80&w=2070&auto=format&fit=crop',
    vibe: 'vibe-maxxing',
    bubbles: [
      { id: '2-1', x: 100, y: 100, vx: 2, vy: 0, size: 2 },
      { id: '2-2', x: 600, y: 100, vx: -2, vy: 0, size: 2 }
    ]
  },
  {
    id: 3,
    name: 'Sector 03: Zenith_Acquisition',
    background: 'https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?q=80&w=2024&auto=format&fit=crop',
    vibe: 'vibe-leaning-forward',
    bubbles: [
      { id: '3-1', x: 400, y: 80, vx: 3, vy: 0, size: 3 },
      { id: '3-2', x: 400, y: 80, vx: -3, vy: 0, size: 1 }
    ]
  }
];

const GRAVITY = 0.15;
const BOUNCE = -1;
const PLAYER_SPEED = 7;
const HARPOON_SPEED = 10;

const BubbleTrouble = () => {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const currentLevel = LEVELS[currentLevelIdx];
  
  const [bubbles, setBubbles] = useState<Bubble[]>(currentLevel.bubbles);
  const [playerX, setPlayerX] = useState(400);
  const [harpoon, setHarpoon] = useState<{ x: number, y: number } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [levelSuccess, setLevelSuccess] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const { vibeTheme, setVibeFromContent } = useVibe();

  // Initialize Level
  useEffect(() => {
    setBubbles(currentLevel.bubbles.map(b => ({ ...b, id: `${currentLevelIdx}-${b.id}` })));
    setPlayerX(400);
    setHarpoon(null);
    setLevelSuccess(false);
    // Set Vibe based on level
    setVibeFromContent(currentLevel.vibe === 'default' ? 'neutral' : currentLevel.vibe);
  }, [currentLevelIdx]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameOver || levelSuccess) return;
    if (e.key === 'ArrowLeft') setPlayerX(prev => Math.max(20, prev - PLAYER_SPEED));
    if (e.key === 'ArrowRight') setPlayerX(prev => Math.min(780, prev + PLAYER_SPEED));
    if (e.key === ' ' && !harpoon) {
      setHarpoon({ x: playerX + 15, y: 550 });
    }
  }, [playerX, harpoon, gameOver, levelSuccess]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const startNextLevel = () => {
    if (currentLevelIdx < LEVELS.length - 1) {
      setCurrentLevelIdx(prev => prev + 1);
    } else {
      // Game Complete logic could go here
      window.location.reload();
    }
  };

  useEffect(() => {
    if (gameOver || levelSuccess) return;

    const interval = setInterval(() => {
      setBubbles(prevBubbles => {
        if (prevBubbles.length === 0) {
          setLevelSuccess(true);
          return [];
        }

        let newBubbles = prevBubbles.map(b => {
          let nx = b.x + b.vx;
          let ny = b.y + b.vy;
          let nvx = b.vx;
          let nvy = b.vy + GRAVITY;

          // Wall collisions
          if (nx < 0 || nx > 750) nvx *= BOUNCE;
          if (ny > 500) {
            nvy = -Math.sqrt(b.size * 25); // Higher bounce for bigger bubbles
          }

          // Player collision
          const distToPlayer = Math.sqrt(Math.pow(nx - playerX, 2) + Math.pow(ny - 550, 2));
          if (distToPlayer < b.size * 20) {
            setGameOver(true);
          }

          return { ...b, x: nx, y: ny, vx: nvx, vy: nvy };
        });

        // Harpoon collision
        if (harpoon) {
          const hitIndex = newBubbles.findIndex(b => 
            harpoon.x > b.x - 10 && harpoon.x < b.x + b.size * 50 + 10 &&
            harpoon.y < b.y + b.size * 50
          );

          if (hitIndex !== -1) {
            const hitBubble = newBubbles[hitIndex];
            newBubbles.splice(hitIndex, 1);
            setHarpoon(null);

            if (hitBubble.size > 1) {
              newBubbles.push(
                { id: Math.random().toString(), x: hitBubble.x, y: hitBubble.y, vx: -2, vy: -5, size: hitBubble.size - 1 },
                { id: Math.random().toString(), x: hitBubble.x, y: hitBubble.y, vx: 2, vy: -5, size: hitBubble.size - 1 }
              );
            }
          }
        }

        return newBubbles;
      });

      if (harpoon) {
        setHarpoon(prev => {
          if (!prev) return null;
          if (prev.y < 0) return null;
          return { ...prev, y: prev.y - HARPOON_SPEED };
        });
      }
    }, 16);

    return () => clearInterval(interval);
  }, [harpoon, playerX, gameOver, levelSuccess]);

  return (
    <div 
      ref={gameContainerRef}
      className="relative w-[800px] h-[600px] bg-slate-900 border-4 border-slate-800 mx-auto overflow-hidden rounded-3xl shadow-2xl"
    >
      {/* Dynamic Background Art */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
        style={{ backgroundImage: `url('${currentLevel.background}')` }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      </div>

      {/* Background Grid Overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #4ade80 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Harpoon */}
      {harpoon && (
        <div 
          className="absolute bg-green-500 w-1 shadow-[0_0_15px_#4ade80] z-10"
          style={{ left: harpoon.x, top: harpoon.y, bottom: 0 }}
        />
      )}

      {/* Bubbles (TacticalCloth Instances) */}
      {bubbles.map(b => (
        <div 
          key={b.id}
          data-testid="bubble"
          className="absolute z-20"
          style={{ 
            left: b.x, 
            top: b.y, 
            transform: `scale(${b.size / 3})`,
            transformOrigin: 'top left' 
          }}
        >
          <TacticalCloth 
            width={150} 
            height={180} 
            moodColor={vibeTheme?.variables?.['--primary-glow']}
            status="COMBAT"
          />
        </div>
      ))}

      {/* Player */}
      <div 
        className="absolute bottom-4 z-30"
        style={{ left: playerX }}
      >
        <div className="w-10 h-16 bg-blue-600 rounded-t-lg border-2 border-blue-400 shadow-[0_0_30px_rgba(37,99,235,0.6)] flex flex-col items-center">
          <div className="w-6 h-6 bg-white rounded-full mt-2 border-2 border-blue-400" />
          <div className="w-8 h-2 bg-blue-400 mt-2" />
        </div>
      </div>

      {/* HUD */}
      <div className="absolute top-4 left-4 font-mono text-xs text-green-500 bg-black/80 p-3 rounded-xl border border-green-500/20 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>{currentLevel.name}</span>
        </div>
        MISSION_STATUS: {gameOver ? 'TERMINATED' : 'ACTIVE'}<br/>
        TARGET_COUNT: {bubbles.length}
      </div>

      {gameOver && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-[100] backdrop-blur-xl">
          <h2 className="text-7xl font-black text-red-600 uppercase italic tracking-tighter mb-4 drop-shadow-[0_0_30px_rgba(220,38,38,0.5)]">Game Over</h2>
          <button 
            onClick={() => window.location.reload()}
            className="px-10 py-4 bg-red-600 text-white font-bold rounded-full hover:bg-red-500 transition-all uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.3)]"
          >
            Re-Initialize
          </button>
        </div>
      )}

      {levelSuccess && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-[100] backdrop-blur-xl">
          <h2 className="text-7xl font-black text-green-500 uppercase italic tracking-tighter mb-4 drop-shadow-[0_0_30px_rgba(34,197,94,0.5)]">Mission Success</h2>
          <p className="text-white/60 font-mono mb-10 tracking-[0.3em]">{currentLevel.name} // SECURED</p>
          <button 
            onClick={startNextLevel}
            className="px-10 py-4 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-500 transition-all uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.3)]"
          >
            {currentLevelIdx < LEVELS.length - 1 ? 'Next Sector' : 'Complete Operation'}
          </button>
        </div>
      )}
    </div>
  );
};


export default BubbleTrouble;
