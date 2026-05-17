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
  listing: string;
  location: string;
  background: string;
  bubbles: Bubble[];
  vibe: string;
}

const LISTING_SECTORS = [
  { name: 'Bowie_Ranch_Gate', listing: 'Bowie Highway Ranch', location: 'Bowie, TX', background: '/images/properties/ranch1.jpg' },
  { name: 'Industrial_Logic', listing: 'Holly Ridge Estates 2.5ac', location: 'Decatur, TX', background: '/images/properties/244ridge1.jpg' },
  { name: 'Barndo_Shop_Line', listing: 'Sunset Barndominium w/ Shop', location: 'Sunset, TX', background: '/images/properties/barndo1.jpg' },
  { name: 'Rhome_Commuter_Run', listing: 'Rhome Commuter Rental', location: 'Rhome, TX', background: '/images/properties/rhome1.jpg' },
  { name: 'Alvord_Land_Claim', listing: 'Alvord 980 Franklin - Land', location: 'Alvord, TX', background: '/images/properties/land1.jpg' },
  { name: 'Big_Sky_RV_Field', listing: 'Big Sky RV - Decatur', location: 'Decatur, TX', background: '/images/properties/ranch1.jpg' },
  { name: 'Meridian_Lease_Lock', listing: 'The Meridian - 2BR', location: 'Bowie, TX', background: '/images/properties/rhome1.jpg' },
  { name: 'Lakefront_Cabin_Final', listing: 'Sunset Lakefront Cabin', location: 'Sunset, TX', background: '/images/properties/244ridge1.jpg' },
  { name: 'Flex_Space_Pressure', listing: 'Decatur Flex Space - 5k sqft', location: 'Decatur, TX', background: '/images/properties/barndo1.jpg' },
  { name: 'Franklin_Overlook', listing: 'Alvord Overlook - Off-Grid Spot', location: 'Alvord, TX', background: '/images/properties/land1.jpg' }
];

const VIBE_SEQUENCE = ['default', 'vibe-maxxing', 'vibe-leaning-forward', 'vibe-expanding-brain'];

const createLevelBubbles = (level: number): Bubble[] => {
  const speedBase = 1.55 + Math.min(level * 0.055, 2.75);

  return Array.from({ length: level }, (_, index) => {
    const lane = index % 10;
    const row = Math.floor(index / 10);
    const wave = Math.sin((level * 17 + index * 31) * 0.37);
    // Level 1 starts with a large bubble to ensure splitting test works
    const size = level === 1 ? 3 : (level < 4 ? 1 + (index % 2) : index % 7 === 0 ? 3 : index % 3 === 0 ? 2 : 1);
    const direction = index % 2 === 0 ? 1 : -1;

    return {
      id: `${level}-${index + 1}`,
      x: 40 + lane * 72 + (wave * 12),
      y: 55 + row * 32 + Math.abs(wave) * 18,
      vx: direction * (speedBase + (index % 5) * 0.18),
      vy: -Math.abs(wave) * 1.2,
      size
    };
  });
};

const LEVELS: LevelConfig[] = Array.from({ length: 50 }, (_, index) => {
  const id = index + 1;
  const sector = LISTING_SECTORS[index % LISTING_SECTORS.length];

  return {
    id,
    name: `Sector ${String(id).padStart(2, '0')}: ${sector.name}`,
    listing: sector.listing,
    location: sector.location,
    background: sector.background,
    vibe: VIBE_SEQUENCE[index % VIBE_SEQUENCE.length],
    bubbles: createLevelBubbles(id)
  };
});

const GRAVITY = 0.15;
const BOUNCE = -1;
const PLAYER_SPEED = 7;
const HARPOON_SPEED = 10;
const ARCADE_BALL_SPRITE = '/arcade/redball.avif';
const GAMEPLAY_KEYS = new Set([' ', 'Spacebar', 'Space', 'ArrowLeft', 'ArrowRight']);

const isEditableKeyTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  return (
    element?.tagName === 'INPUT' ||
    element?.tagName === 'TEXTAREA' ||
    element?.tagName === 'SELECT' ||
    element?.isContentEditable
  );
};

const isGameplayKey = (e: KeyboardEvent) => GAMEPLAY_KEYS.has(e.key) || GAMEPLAY_KEYS.has(e.code);

const BubbleTrouble = () => {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const currentLevel = LEVELS[currentLevelIdx];
  
  const [bubbles, setBubbles] = useState<Bubble[]>(currentLevel.bubbles);
  const [playerX, setPlayerX] = useState(400);
  const [harpoon, setHarpoon] = useState<{ x: number, y: number } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [levelSuccess, setLevelSuccess] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const { setVibeFromContent } = useVibe();

  // Initialize Level
  useEffect(() => {
    setBubbles(currentLevel.bubbles.map(b => ({ ...b, id: `${currentLevelIdx}-${b.id}` })));
    setPlayerX(400);
    setHarpoon(null);
    setLevelSuccess(false);
    // Set Vibe based on level
    setVibeFromContent(currentLevel.vibe === 'default' ? 'neutral' : currentLevel.vibe);
  }, [currentLevel.bubbles, currentLevel.vibe, currentLevelIdx, setVibeFromContent]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isEditableKeyTarget(e.target) && isGameplayKey(e)) {
      e.preventDefault();
    }

    if (gameOver || levelSuccess) return;
    if (e.key === 'ArrowLeft') setPlayerX(prev => Math.max(20, prev - PLAYER_SPEED));
    if (e.key === 'ArrowRight') setPlayerX(prev => Math.min(780, prev + PLAYER_SPEED));
    if ((e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space') && !harpoon) {
      setHarpoon({ x: playerX + 15, y: 550 });
    }
  }, [playerX, harpoon, gameOver, levelSuccess]);

  useEffect(() => {
    const suppressBrowserScroll = (e: KeyboardEvent) => {
      if (!isEditableKeyTarget(e.target) && isGameplayKey(e)) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keypress', suppressBrowserScroll, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keypress', suppressBrowserScroll, { capture: true });
    };
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
          if (ny > 560) {
            nvy = -Math.sqrt(b.size * 22); // Lower bounce slightly
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

      {/* Bubbles */}
      {bubbles.map(b => (
        <div 
          key={b.id}
          data-testid="bubble"
          className="absolute z-20 pointer-events-none"
          style={{ 
            left: b.x, 
            top: b.y, 
            width: b.size * 50,
            height: b.size * 50,
            transformOrigin: 'center'
          }}
        >
          <TacticalCloth 
            width={b.size * 50} 
            height={b.size * 50} 
            id={b.id.slice(0, 4)} 
            status="ACTIVE"
            moodColor="#dc2626"
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
          <span data-testid="hud-level-name">{currentLevel.name}</span>
        </div>
        LISTING: {currentLevel.listing}<br/>
        MARKET: {currentLevel.location}<br/>
        MISSION_STATUS: {gameOver ? 'TERMINATED' : 'ACTIVE'}<br/>
        TARGET_COUNT: {bubbles.length}<br/>
        LEVEL: {currentLevelIdx + 1}/{LEVELS.length}
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
