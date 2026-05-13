'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TacticalCloth from '@/components/TacticalCloth';
import { useVibe } from '@/context/VibeContext';

interface Fish {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rank: 'Tier_I' | 'Tier_II' | 'Tier_III' | 'Tier_IV';
  size: number;
  hunger: number; // 0 to 100
  growthPoints: number;
  lastCoinTime: number;
  direction: 'left' | 'right';
  isShielded?: boolean;
}

interface Threat {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  type: 'Incursion_Entity' | 'System_Anomaly';
}

interface Pet {
  id: string;
  type: 'Resource_Collector' | 'Defense_Guardian' | 'Optimization_Node';
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Pellet {
  id: string;
  x: number;
  y: number;
}

interface Coin {
  id: string;
  x: number;
  y: number;
  value: number;
  type: 'silver' | 'gold' | 'diamond';
}

const OPERATIONAL_TIERS = {
  Tier_I: { size: 1, label: "Tier I: Entry", color: "text-blue-400" },
  Tier_II: { size: 2, label: "Tier II: Standard", color: "text-emerald-400" },
  Tier_III: { size: 3, label: "Tier III: Advanced", color: "text-slate-300" },
  Tier_IV: { size: 4, label: "Tier IV: Executive", color: "text-purple-400" },
};

const TANK_WIDTH = 800;
const TANK_HEIGHT = 600;
const THREAT_SPAWN_CHANCE = 0.002;
const LASER_DAMAGE = 20;
const HUNGER_DECAY = 0.15;
const COIN_INTERVALS: Record<number, number> = {
  2: 5000, 
  3: 10000, 
  4: 15000, 
};

// Pure Logic Systems
const physicsSystem = (entity: { x: number, y: number, vx: number, vy: number }, bounds: { w: number, h: number }) => {
  let nx = entity.x + entity.vx;
  let ny = entity.y + entity.vy;
  let nvx = entity.vx;
  let nvy = entity.vy;

  if (nx < 20 || nx > bounds.w - 100) nvx *= -1;
  if (ny < 20 || ny > bounds.h - 100) nvy *= -1;

  return { ...entity, x: nx, y: ny, vx: nvx, vy: nvy };
};

const vitalitySystem = (f: Fish, hasShield: boolean) => {
  let nhunger = f.hunger - (hasShield ? HUNGER_DECAY * 0.4 : HUNGER_DECAY);
  return { ...f, hunger: nhunger };
};

const aiSystem = (f: Fish, pellets: Pellet[], threats: Threat[]) => {
  let nvx = f.vx;
  let nvy = f.vy;

  if (threats.length > 0) {
    const nearestThreat = threats[0];
    const dist = Math.sqrt(Math.pow(f.x - nearestThreat.x, 2) + Math.pow(f.y - nearestThreat.y, 2));
    if (dist < 180) {
      const dx = f.x - nearestThreat.x;
      const dy = f.y - nearestThreat.y;
      nvx += (dx / dist) * 1.5;
      nvy += (dy / dist) * 1.5;
    }
  }

  if (f.hunger < 80 && pellets.length > 0) {
    const nearestPellet = pellets.sort((a, b) => 
      Math.sqrt(Math.pow(a.x - f.x, 2) + Math.pow(a.y - f.y, 2)) -
      Math.sqrt(Math.pow(b.x - f.x, 2) + Math.pow(b.y - f.y, 2))
    )[0];
    
    const dx = nearestPellet.x - f.x;
    const dy = nearestPellet.y - f.y;
    nvx += dx * 0.012;
    nvy += dy * 0.012;
  }

  return { ...f, vx: nvx, vy: nvy, direction: nvx > 0 ? 'right' as const : 'left' as const };
};

const Insaniquarium = () => {
  const [fish, setFish] = useState<Fish[]>([
    { id: 'unit-1', x: 400, y: 300, vx: 1, vy: 0.5, rank: 'Tier_I', size: 1, hunger: 100, growthPoints: 0, lastCoinTime: Date.now(), direction: 'right' }
  ]);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [pellets, setPellets] = useState<Pellet[]>([]);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [money, setMoney] = useState(1000);
  const [evolutionStage, setEvolutionStage] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  
  const { vibeTheme, currentVibe, setVibeFromContent } = useVibe();
  const tankRef = useRef<HTMLDivElement>(null);

  const spawnUnit = () => {
    if (money >= 100) {
      setMoney(prev => prev - 100);
      setFish(prev => [...prev, {
        id: `unit-${Date.now()}`,
        x: Math.random() * (TANK_WIDTH - 100) + 50,
        y: Math.random() * (TANK_HEIGHT - 100) + 50,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        rank: 'Tier_I',
        size: 1,
        hunger: 100,
        growthPoints: 0,
        lastCoinTime: Date.now(),
        direction: Math.random() > 0.5 ? 'right' : 'left'
      }]);
    }
  };

  const deploySubsystem = (type: Pet['type']) => {
    const cost = 500;
    if (money >= cost && !pets.find(p => p.type === type)) {
      setMoney(prev => prev - cost);
      setPets(prev => [...prev, { 
        id: `subsystem-${type}`, 
        type, 
        x: 400, y: 550, 
        vx: (Math.random() - 0.5) * 2, 
        vy: (Math.random() - 0.5) * 2 
      }]);
    }
  };

  const acquireUpgrade = () => {
    const cost = 1000 * (evolutionStage + 1);
    if (money >= cost && evolutionStage < 3) {
      setMoney(prev => prev - cost);
      setEvolutionStage(prev => prev + 1);
    }
  };

  const collectResource = useCallback((id: string, value: number) => {
    setMoney(prev => prev + value);
    setCoins(prev => prev.filter(c => c.id !== id));
  }, []);

  const handleInteraction = (e: React.MouseEvent) => {
    if (gameOver) return;
    const rect = tankRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (threats.length > 0) {
      setThreats(prev => prev.map(t => {
        const dist = Math.sqrt(Math.pow(t.x - x, 2) + Math.pow(t.y - y, 2));
        if (dist < 80) return { ...t, health: t.health - LASER_DAMAGE };
        return t;
      }).filter(t => t.health > 0));
      return;
    }

    if (money >= 5) {
      setMoney(prev => prev - 5);
      setPellets(prev => [...prev, { id: `pellet-${Date.now()}`, x, y }]);
    }
  };

  useEffect(() => {
    if (gameOver) return;

    const interval = setInterval(() => {
      setPellets(prev => prev.map(p => ({ ...p, y: p.y + 2.5 })).filter(p => p.y < TANK_HEIGHT));
      setCoins(prev => prev.map(c => ({ ...c, y: Math.min(TANK_HEIGHT - 40, c.y + 3.5) })));

      setPets(prevPets => prevPets.map(p => {
        let updated = physicsSystem(p, { w: TANK_WIDTH, h: TANK_HEIGHT });

        if (p.type === 'Resource_Collector') {
          const targetCoins = coins.filter(c => c.y > TANK_HEIGHT - 100);
          const nearestCoin = targetCoins.sort((a, b) => 
            Math.sqrt(Math.pow(a.x - p.x, 2) + Math.pow(a.y - p.y, 2)) -
            Math.sqrt(Math.pow(b.x - p.x, 2) + Math.pow(b.y - p.y, 2))
          )[0];
          if (nearestCoin) {
            updated.x += (nearestCoin.x - p.x) * 0.08;
            updated.y += (nearestCoin.y - p.y) * 0.08;
            if (Math.sqrt(Math.pow(nearestCoin.x - p.x, 2) + Math.pow(nearestCoin.y - p.y, 2)) < 30) {
              collectResource(nearestCoin.id, nearestCoin.value);
            }
          } else {
            updated.y = TANK_HEIGHT - 40;
          }
        }

        if (p.type === 'Optimization_Node') {
          const hungriest = [...fish].sort((a, b) => a.hunger - b.hunger)[0];
          if (hungriest) {
            updated.x += (hungriest.x - p.x) * 0.05;
            updated.y += (hungriest.y - p.y) * 0.05;
          }
        }

        if (p.type === 'Defense_Guardian') {
          updated.x += (400 - p.x) * 0.02;
          updated.y += (300 - p.y) * 0.02;
        }

        return { ...p, ...updated };
      }));

      if (Math.random() < THREAT_SPAWN_CHANCE && threats.length === 0) {
        setThreats([{ 
          id: `threat-${Date.now()}`, 
          x: Math.random() > 0.5 ? -100 : TANK_WIDTH + 100, 
          y: Math.random() * TANK_HEIGHT, 
          vx: Math.random() > 0.5 ? 2.5 : -2.5, 
          vy: (Math.random() - 0.5) * 2, 
          health: 150, type: 'Incursion_Entity' 
        }]);
        setVibeFromContent('vibe-leaning-forward');
      }

      setThreats(prev => prev.map(t => {
        let updated = physicsSystem(t, { w: TANK_WIDTH, h: TANK_HEIGHT });
        const target = fish.sort((a, b) => 
          Math.sqrt(Math.pow(a.x - t.x, 2) + Math.pow(a.y - t.y, 2)) -
          Math.sqrt(Math.pow(b.x - t.x, 2) + Math.pow(b.y - t.y, 2))
        )[0];

        if (target) {
          updated.x += (target.x - t.x) * 0.015;
          updated.y += (target.y - t.y) * 0.015;
        }

        return { ...t, ...updated };
      }));

      if (threats.length === 0 && currentVibe === 'vibe-leaning-forward') {
        setVibeFromContent('neutral');
      }

      setFish(prevFish => {
        const nextFish = prevFish.map(f => {
          const hasShield = pets.some(p => p.type === 'Defense_Guardian');
          
          let state = aiSystem(f, pellets, threats);
          state = vitalitySystem(state, hasShield);
          state = physicsSystem(state, { w: TANK_WIDTH, h: TANK_HEIGHT }) as Fish;

          if (state.hunger < 80 && pellets.length > 0) {
            const nearestPellet = pellets.sort((a, b) => 
              Math.sqrt(Math.pow(a.x - state.x, 2) + Math.pow(a.y - state.y, 2)) -
              Math.sqrt(Math.pow(b.x - state.x, 2) + Math.pow(b.y - state.y, 2))
            )[0];
            
            if (Math.sqrt(Math.pow(nearestPellet.x - state.x, 2) + Math.pow(nearestPellet.y - state.y, 2)) < 35) {
              setPellets(prev => prev.filter(p => p.id !== nearestPellet.id));
              state.hunger = Math.min(100, state.hunger + 35);
              state.growthPoints += 1;
              
              if (state.growthPoints >= 5 && state.size < 4) {
                state.size += 1;
                state.growthPoints = 0;
                state.rank = state.size === 2 ? 'Tier_II' : state.size === 3 ? 'Tier_III' : 'Tier_IV';
              }
            }
          }

          const now = Date.now();
          if (state.size > 1 && now - state.lastCoinTime > (COIN_INTERVALS[state.size] || 10000)) {
            const coinType = state.size === 2 ? 'silver' : state.size === 3 ? 'gold' : 'diamond';
            const coinValue = state.size === 2 ? 15 : state.size === 3 ? 35 : 200;
            setCoins(prev => [...prev, { id: `resource-${now}-${state.id}`, x: state.x, y: state.y, value: coinValue, type: coinType as any }]);
            state.lastCoinTime = now;
          }

          return { ...state, isShielded: hasShield };
        }).filter(f => f.hunger > 0);

        if (nextFish.length === 0 && money < 100) setGameOver(true);
        return nextFish;
      });
    }, 32);

    return () => clearInterval(interval);
  }, [pellets, threats, pets, money, gameOver, coins, currentVibe, fish, setVibeFromContent, collectResource]);

  return (
    <div 
      ref={tankRef}
      onClick={handleInteraction}
      className={`relative w-[800px] h-[600px] bg-cyan-900 border-8 border-slate-800 mx-auto overflow-hidden rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] cursor-crosshair transition-all duration-500
        ${threats.length > 0 ? 'ring-4 ring-red-500 ring-inset animate-pulse' : ''}`}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/20 to-blue-900/40" />
      
      {threats.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle,transparent_40%,rgba(220,38,38,0.1)_100%)]" />
      )}

      {/* Interface & Management */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-[100] pointer-events-none">
        <div className="space-y-2">
          <div className="bg-black/80 p-4 rounded-2xl border border-white/10 backdrop-blur-md font-mono text-white pointer-events-auto shadow-2xl">
            <div data-testid="capacity-hud" className="text-3xl font-black text-yellow-400 mb-1">${money}</div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-white/40">OPERATIONAL_CAPACITY</div>
          </div>
          
          <div className="bg-black/60 p-3 rounded-xl border border-white/5 backdrop-blur-md pointer-events-auto">
            <div className="text-[8px] font-bold text-blue-400 uppercase mb-2">System_Evolution_Sequence</div>
            <div className="flex gap-2">
              {[0,1,2].map(i => (
                <div key={i} className={`w-6 h-8 rounded-full border-2 transition-all ${i < evolutionStage ? 'bg-blue-500 border-blue-300 shadow-[0_0_10px_#3b82f6]' : 'bg-white/5 border-white/10'}`} />
              ))}
            </div>
            {evolutionStage < 3 && (
              <button 
                data-testid="upgrade-btn"
                onClick={acquireUpgrade} 
                className="mt-3 w-full py-1 bg-white/10 hover:bg-white/20 rounded text-[8px] font-black uppercase text-white transition-all"
              >
                Upgrade_Sequence (${1000 * (evolutionStage + 1)})
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 pointer-events-auto items-end">
          <button 
            data-testid="init-unit-btn"
            onClick={spawnUnit} 
            className={`px-4 py-2 rounded-xl font-bold uppercase text-[9px] tracking-widest transition-all border ${money >= 100 ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg' : 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed'}`}
          >
            Initialize_Unit ($100)
          </button>
          <div className="flex gap-2">
            <button data-testid="subsystem-collector-btn" onClick={() => deploySubsystem('Resource_Collector')} className={`p-2 rounded-lg border text-[8px] font-black uppercase transition-all ${money >= 500 && !pets.find(p=>p.type==='Resource_Collector') ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 text-white/20 border-white/5'}`}>Collector</button>
            <button data-testid="subsystem-guardian-btn" onClick={() => deploySubsystem('Defense_Guardian')} className={`p-2 rounded-lg border text-[8px] font-black uppercase transition-all ${money >= 500 && !pets.find(p=>p.type==='Defense_Guardian') ? 'bg-purple-600 border-purple-400 text-white' : 'bg-white/5 text-white/20 border-white/5'}`}>Guardian</button>
            <button data-testid="subsystem-node-btn" onClick={() => deploySubsystem('Optimization_Node')} className={`p-2 rounded-lg border text-[8px] font-black uppercase transition-all ${money >= 500 && !pets.find(p=>p.type==='Optimization_Node') ? 'bg-orange-600 border-orange-400 text-white' : 'bg-white/5 text-white/20 border-white/5'}`}>Node</button>
          </div>
        </div>
      </div>

      {/* System Threats */}
      {threats.map(t => (
        <div 
          key={t.id} 
          data-testid="anomaly"
          className="absolute z-40 transition-all duration-300" 
          style={{ left: t.x, top: t.y }}
        >
          <div className="relative group">
            <TacticalCloth width={120} height={120} moodColor="#ef4444" status="ALERT" />
            <div className="absolute -top-6 left-0 w-full h-1.5 bg-black/60 rounded-full border border-white/10 overflow-hidden">
              <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${(t.health / 150) * 100}%` }} />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-black text-red-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              INCURSION_DETECTED: {t.type}
            </div>
          </div>
        </div>
      ))}

      {/* Subsystems */}
      {pets.map(p => (
        <div 
          key={p.id} 
          data-testid="subsystem"
          className="absolute z-30 pointer-events-none" 
          style={{ left: p.x, top: p.y }}
        >
          <div className="relative flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full border-2 animate-pulse ${p.type === 'Resource_Collector' ? 'bg-blue-500 border-blue-300' : p.type === 'Defense_Guardian' ? 'bg-purple-500 border-purple-300 shadow-[0_0_15px_#a855f7]' : 'bg-orange-500 border-orange-300'}`} />
            <div className="mt-1 text-[7px] font-black text-white uppercase tracking-tighter bg-black/40 px-1 rounded">{p.type.split('_')[0]}</div>
          </div>
        </div>
      )}

      {/* Resource Inputs */}
      {pellets.map(p => <div key={p.id} data-testid="input" className="absolute w-2 h-2 bg-orange-500 rounded-full shadow-[0_0_8px_orange] z-10" style={{ left: p.x, top: p.y }} />)}

      {/* Output Units */}
      {coins.map(c => (
        <div 
          key={c.id} 
          data-testid="resource"
          onClick={(e) => { e.stopPropagation(); collectResource(c.id, c.value); }} 
          className={`absolute w-7 h-7 rounded-full cursor-pointer animate-bounce flex items-center justify-center font-black text-[10px] border-2 shadow-2xl z-50 
            ${c.type === 'silver' ? 'bg-slate-300 border-slate-100 text-slate-600' : 
              c.type === 'gold' ? 'bg-yellow-400 border-yellow-200 text-yellow-800 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 
              'bg-blue-400 border-blue-200 text-blue-900 shadow-[0_0_20px_rgba(59,130,246,0.5)]'}`} 
          style={{ left: c.x, top: c.y }}
        >
          $
        </div>
      ))}

      {/* Operational Units */}
      {fish.map(f => (
        <div 
          key={f.id} 
          data-testid="unit"
          className={`absolute transition-all duration-300 z-20 ${f.direction === 'left' ? 'scale-x-[-1]' : ''}`} 
          style={{ left: f.x, top: f.y, transform: `${f.direction === 'left' ? 'scaleX(-1)' : ''} scale(${(f.size * 0.2) + 0.4})` }}
        >
          <div className="relative group">
            <TacticalCloth width={100} height={100} moodColor={f.isShielded ? '#a855f7' : f.hunger < 30 ? '#ef4444' : (vibeTheme?.variables?.['--primary-glow'] as string || '#00f2ff')} status={f.hunger < 30 ? "VITALITY_LOW" : "OPERATIONAL"} />
            
            <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[7px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 px-1.5 py-0.5 rounded border border-white/10 ${OPERATIONAL_TIERS[f.rank].color}`}>
              {OPERATIONAL_TIERS[f.rank].label}
            </div>

            <div className="absolute -top-4 left-0 w-full h-1 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div className={`h-full transition-all duration-300 ${f.hunger < 30 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${f.hunger}%` }} />
            </div>
            {f.isShielded && <div className="absolute inset-0 rounded-full border-2 border-purple-400/30 animate-ping" />}
          </div>
        </div>
      ))}

      {evolutionStage === 3 && (
        <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-2xl flex flex-col items-center justify-center z-[200] animate-in fade-in zoom-in duration-1000">
          <div className="relative w-48 h-64 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-full shadow-[0_0_100px_rgba(34,197,94,0.5)] animate-bounce flex items-center justify-center border-4 border-white/30">
            <div className="text-white font-black text-center uppercase tracking-widest text-xl">CORE_SYNTHESIS_COMPLETE</div>
          </div>
          <button onClick={() => window.location.reload()} className="mt-12 px-12 py-5 bg-white text-blue-600 font-black rounded-full hover:scale-105 transition-all uppercase tracking-[0.3em] shadow-2xl">Restart_Simulation</button>
        </div>
      )}

      {gameOver && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-[100] backdrop-blur-2xl">
          <h2 className="text-8xl font-black text-red-600 uppercase italic tracking-tighter mb-4 drop-shadow-[0_0_40px_rgba(220,38,38,0.6)]">SIMULATION_FAILED</h2>
          <p className="text-white/40 font-mono mb-12 tracking-[0.5em]">TOTAL_BIOMASS_LIQUIDATED // RESERVES_EXHAUSTED</p>
          <button onClick={() => window.location.reload()} className="px-12 py-5 bg-red-600 text-white font-black rounded-full hover:bg-red-500 transition-all uppercase tracking-widest shadow-2xl border-2 border-red-400">Re-Initialize</button>
        </div>
      )}
    </div>
  );
};

export default Insaniquarium;
